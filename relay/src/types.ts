import type { RelayRoom } from "./relay-room";

export type AccountRole = "owner" | "observer";
export type TokenType = "access" | "refresh";

export interface Env {
  AUTH_CREDENTIALS: string;
  EXPO_ACCESS_TOKEN?: string;
  ROOMS: DurableObjectNamespace<RelayRoom>;
  TOKEN_SECRET: string;
}

export interface CredentialRecord {
  hash: string;
  salt: string;
  username: string;
}

export interface CredentialSet {
  accounts: Record<AccountRole, CredentialRecord>;
  algorithm: "PBKDF2-SHA-256";
  iterations: number;
  version: 1;
}

export interface TokenClaims {
  aud: "dudu-plan-app";
  exp: number;
  iat: number;
  iss: "dudu-plan-relay";
  jti: string;
  role: AccountRole;
  room: "dudu-plan";
  tokenType: TokenType;
  v: 1;
}

export interface AuthTokens {
  accountName: string;
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  refreshTokenExpiresAt: number;
  role: AccountRole;
}
