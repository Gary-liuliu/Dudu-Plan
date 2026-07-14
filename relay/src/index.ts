import { issueTokens, requireAccessToken, verifyCredentials, verifyToken } from "./auth";
import { jsonResponse, methodNotAllowed, optionsResponse, readJsonBody, withCors } from "./http";
import { sendWorkoutPush } from "./push";
import { RelayRoom } from "./relay-room";
import type { Env } from "./types";

interface LoginBody {
  password: string;
  username: string;
}

interface RefreshBody {
  refreshToken: string;
}

function isLoginBody(value: unknown): value is LoginBody {
  if (!value || typeof value !== "object") {
    return false;
  }
  const body = value as Partial<LoginBody>;
  return (
    typeof body.username === "string" &&
    body.username.length <= 20 &&
    typeof body.password === "string" &&
    body.password.length >= 1 &&
    body.password.length <= 256
  );
}

function isRefreshBody(value: unknown): value is RefreshBody {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Partial<RefreshBody>).refreshToken === "string",
  );
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }
  if (!isLoginBody(body)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const role = await verifyCredentials(env.AUTH_CREDENTIALS, body.username, body.password);
  if (!role) {
    return jsonResponse({ error: "invalid_credentials" }, 401);
  }
  return jsonResponse(await issueTokens(role, env.TOKEN_SECRET));
}

async function handleRefresh(request: Request, env: Env): Promise<Response> {
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }
  if (!isRefreshBody(body)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const claims = await verifyToken(body.refreshToken, env.TOKEN_SECRET, "refresh");
  if (!claims) {
    return jsonResponse({ error: "invalid_refresh_token" }, 401);
  }
  return jsonResponse(await issueTokens(claims.role, env.TOKEN_SECRET));
}

async function handleRealtime(request: Request, env: Env): Promise<Response> {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return jsonResponse({ error: "websocket_required" }, 426);
  }
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("access_token");
  const claims = queryToken
    ? await verifyToken(queryToken, env.TOKEN_SECRET, "access")
    : await requireAccessToken(request, env);
  if (!claims) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const roomStub = env.ROOMS.get(env.ROOMS.idFromName(claims.room));
  const relayRequest = new Request("https://relay.internal/connect", {
    headers: {
      upgrade: "websocket",
      "x-relay-role": claims.role,
    },
  });
  return withCors(await roomStub.fetch(relayRequest));
}

async function handlePush(request: Request, env: Env): Promise<Response> {
  const claims = await requireAccessToken(request, env);
  if (!claims) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }
  if (claims.role !== "owner") {
    return jsonResponse({ error: "forbidden" }, 403);
  }
  return sendWorkoutPush(request, env);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return optionsResponse();
    }

    const { pathname } = new URL(request.url);
    if (pathname === "/auth/login") {
      return request.method === "POST" ? handleLogin(request, env) : methodNotAllowed();
    }
    if (pathname === "/auth/refresh") {
      return request.method === "POST" ? handleRefresh(request, env) : methodNotAllowed();
    }
    if (pathname === "/realtime") {
      return request.method === "GET" ? handleRealtime(request, env) : methodNotAllowed();
    }
    if (pathname === "/push") {
      return request.method === "POST" ? handlePush(request, env) : methodNotAllowed();
    }
    return jsonResponse({ error: "not_found" }, 404);
  },
} satisfies ExportedHandler<Env>;

export { RelayRoom };
