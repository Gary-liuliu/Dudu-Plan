import type {
  AccountRole,
  AuthTokens,
  CredentialSet,
  Env,
  TokenClaims,
  TokenType,
} from "./types";

const ACCESS_TOKEN_SECONDS = 15 * 60;
const REFRESH_TOKEN_SECONDS = 365 * 24 * 60 * 60;
const TOKEN_HEADER = { alg: "HS256", typ: "JWT" } as const;
const accountNames: Record<AccountRole, string> = {
  owner: "嘟嘟",
  observer: "肚肚",
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function stringToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function parseCredentials(rawCredentials: string): CredentialSet {
  const parsed = JSON.parse(rawCredentials) as Partial<CredentialSet>;
  if (
    parsed.version !== 1 ||
    parsed.algorithm !== "PBKDF2-SHA-256" ||
    parsed.iterations !== 100_000 ||
    !parsed.accounts?.owner ||
    !parsed.accounts.observer
  ) {
    throw new Error("invalid_credentials_secret");
  }

  for (const role of ["owner", "observer"] as const) {
    const record = parsed.accounts[role];
    if (
      record.username !== accountNames[role] ||
      typeof record.salt !== "string" ||
      typeof record.hash !== "string"
    ) {
      throw new Error("invalid_credentials_secret");
    }
  }

  return parsed as CredentialSet;
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    passwordKey,
    256,
  );
  return new Uint8Array(derivedBits);
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  const comparedLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < comparedLength; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

export async function verifyCredentials(
  rawCredentials: string,
  username: string,
  password: string,
): Promise<AccountRole | null> {
  const credentials = parseCredentials(rawCredentials);
  const role = (Object.keys(accountNames) as AccountRole[]).find(
    (candidateRole) => accountNames[candidateRole] === username,
  );
  const comparisonRecord = credentials.accounts[role ?? "owner"];
  const providedHash = await derivePasswordHash(
    password,
    base64UrlToBytes(comparisonRecord.salt),
    credentials.iterations,
  );
  const passwordMatches = constantTimeEqual(providedHash, base64UrlToBytes(comparisonRecord.hash));
  return role && passwordMatches ? role : null;
}

async function importTokenKey(tokenSecret: string): Promise<CryptoKey> {
  if (tokenSecret.length < 32) {
    throw new Error("token_secret_too_short");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(tokenSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signToken(claims: TokenClaims, tokenSecret: string): Promise<string> {
  const headerSegment = stringToBase64Url(JSON.stringify(TOKEN_HEADER));
  const payloadSegment = stringToBase64Url(JSON.stringify(claims));
  const unsignedToken = `${headerSegment}.${payloadSegment}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importTokenKey(tokenSecret),
    new TextEncoder().encode(unsignedToken),
  );
  return `${unsignedToken}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

function buildClaims(role: AccountRole, tokenType: TokenType, issuedAt: number, expiresAt: number): TokenClaims {
  return {
    aud: "dudu-plan-app",
    exp: expiresAt,
    iat: issuedAt,
    iss: "dudu-plan-relay",
    jti: crypto.randomUUID(),
    role,
    room: "dudu-plan",
    tokenType,
    v: 1,
  };
}

export async function issueTokens(role: AccountRole, tokenSecret: string): Promise<AuthTokens> {
  const issuedAt = Math.floor(Date.now() / 1_000);
  const accessExpiresAt = issuedAt + ACCESS_TOKEN_SECONDS;
  const refreshExpiresAt = issuedAt + REFRESH_TOKEN_SECONDS;
  const [accessToken, refreshToken] = await Promise.all([
    signToken(buildClaims(role, "access", issuedAt, accessExpiresAt), tokenSecret),
    signToken(buildClaims(role, "refresh", issuedAt, refreshExpiresAt), tokenSecret),
  ]);
  return {
    accountName: accountNames[role],
    accessToken,
    accessTokenExpiresAt: accessExpiresAt * 1_000,
    refreshToken,
    refreshTokenExpiresAt: refreshExpiresAt * 1_000,
    role,
  };
}

function isTokenClaims(value: unknown): value is TokenClaims {
  if (!value || typeof value !== "object") {
    return false;
  }
  const claims = value as Partial<TokenClaims>;
  return (
    claims.v === 1 &&
    claims.iss === "dudu-plan-relay" &&
    claims.aud === "dudu-plan-app" &&
    claims.room === "dudu-plan" &&
    (claims.role === "owner" || claims.role === "observer") &&
    (claims.tokenType === "access" || claims.tokenType === "refresh") &&
    typeof claims.iat === "number" &&
    typeof claims.exp === "number" &&
    typeof claims.jti === "string"
  );
}

export async function verifyToken(
  token: string,
  tokenSecret: string,
  expectedType: TokenType,
): Promise<TokenClaims | null> {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }

  try {
    const [headerSegment, payloadSegment, signatureSegment] = segments;
    const unsignedToken = `${headerSegment}.${payloadSegment}`;
    const signatureMatches = await crypto.subtle.verify(
      "HMAC",
      await importTokenKey(tokenSecret),
      base64UrlToBytes(signatureSegment),
      new TextEncoder().encode(unsignedToken),
    );
    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(headerSegment))) as unknown;
    const claims = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadSegment))) as unknown;
    if (
      !signatureMatches ||
      JSON.stringify(header) !== JSON.stringify(TOKEN_HEADER) ||
      !isTokenClaims(claims) ||
      claims.tokenType !== expectedType ||
      claims.exp <= Math.floor(Date.now() / 1_000)
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

export async function requireAccessToken(request: Request, env: Env): Promise<TokenClaims | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  return verifyToken(authorization.slice(7), env.TOKEN_SECRET, "access");
}
