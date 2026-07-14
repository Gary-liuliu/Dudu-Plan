import { env, runInDurableObject, SELF } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";

interface LoginResult {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  refreshTokenExpiresAt: number;
  role: "owner" | "observer";
}

const testPasswords = {
  owner: "owner-test-password",
  observer: "observer-test-password",
};

async function login(username: "嘟嘟" | "肚肚", password: string): Promise<LoginResult> {
  const response = await SELF.fetch("https://relay.test/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  expect(response.status).toBe(200);
  return response.json<LoginResult>();
}

async function connect(accessToken: string): Promise<WebSocket> {
  const response = await SELF.fetch(
    `https://relay.test/realtime?access_token=${encodeURIComponent(accessToken)}`,
    { headers: { upgrade: "websocket" } },
  );
  expect(response.status).toBe(101);
  const socket = response.webSocket;
  expect(socket).not.toBeNull();
  const initialMessage = nextMessage(socket!);
  socket!.accept();
  await initialMessage;
  return socket!;
}

function nextMessage(socket: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    socket.addEventListener(
      "message",
      (event) => resolve(JSON.parse(event.data as string) as Record<string, unknown>),
      { once: true },
    );
  });
}

function nextClose(socket: WebSocket): Promise<CloseEvent> {
  return new Promise((resolve) => socket.addEventListener("close", resolve, { once: true }));
}

describe("authentication", () => {
  it("logs in both fixed accounts and rotates a refresh token", async () => {
    const owner = await login("嘟嘟", testPasswords.owner);
    const observer = await login("肚肚", testPasswords.observer);
    expect(owner.role).toBe("owner");
    expect(observer.role).toBe("observer");
    const refreshLifetimeMs = owner.refreshTokenExpiresAt - Date.now();
    expect(refreshLifetimeMs).toBeGreaterThan(365 * 24 * 60 * 60 * 1_000 - 2_000);
    expect(refreshLifetimeMs).toBeLessThanOrEqual(365 * 24 * 60 * 60 * 1_000);

    const refreshResponse = await SELF.fetch("https://relay.test/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: owner.refreshToken }),
    });
    expect(refreshResponse.status).toBe(200);
    const refreshed = await refreshResponse.json<LoginResult>();
    expect(refreshed.role).toBe("owner");
    expect(refreshed.accessToken).not.toBe(owner.accessToken);
  });

  it("rejects a wrong password without exposing account details", async () => {
    const response = await SELF.fetch("https://relay.test/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "嘟嘟", password: "wrong-password" }),
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "invalid_credentials" });
  });
});

describe("push authorization", () => {
  afterEach(() => vi.restoreAllMocks());

  it("allows only the owner to forward a constrained workout notification", async () => {
    const owner = await login("嘟嘟", testPasswords.owner);
    const observer = await login("肚肚", testPasswords.observer);
    let forwardedUrl: string | undefined;
    let forwardedPayload: Record<string, unknown> | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const request = new Request(input, init);
      forwardedUrl = request.url;
      forwardedPayload = await request.json<Record<string, unknown>>();
      return Response.json({ data: { status: "ok", id: "receipt-id" } });
    });

    const payload = {
      pushToken: "ExponentPushToken[test-token]",
      event: {
        id: "session-1:workout_started",
        type: "workout_started",
        title: "嘟嘟开始训练了",
        body: "正在进行上肢 A",
        data: { sessionId: "session-1" },
      },
    };
    const observerResponse = await SELF.fetch("https://relay.test/push", {
      method: "POST",
      headers: { authorization: `Bearer ${observer.accessToken}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(observerResponse.status).toBe(403);

    const ownerResponse = await SELF.fetch("https://relay.test/push", {
      method: "POST",
      headers: { authorization: `Bearer ${owner.accessToken}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(ownerResponse.status).toBe(202);
    await expect(ownerResponse.json()).resolves.toEqual({ ok: true });
    expect(forwardedUrl).toBe("https://exp.host/--/api/v2/push/send");
    expect(forwardedPayload).toMatchObject({
      channelId: "observer-updates",
      to: payload.pushToken,
      title: payload.event.title,
      body: payload.event.body,
    });
  });

  it("rejects an Expo ticket error returned with HTTP 200", async () => {
    const owner = await login("嘟嘟", testPasswords.owner);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
      data: {
        status: "error",
        message: "The push notification credentials are invalid.",
        details: { error: "InvalidCredentials" },
      },
    }));

    const response = await SELF.fetch("https://relay.test/push", {
      method: "POST",
      headers: { authorization: `Bearer ${owner.accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        pushToken: "ExponentPushToken[test-token]",
        event: {
          id: "session-2:workout_completed",
          type: "workout_completed",
          title: "嘟嘟完成训练了",
          body: "本次训练已经完成",
          data: { sessionId: "session-2" },
        },
      }),
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "push_provider_rejected" });
  });
});

describe("realtime relay", () => {
  it("pairs roles and enforces role-specific message types", async () => {
    const owner = await login("嘟嘟", testPasswords.owner);
    const observer = await login("肚肚", testPasswords.observer);
    const ownerSocket = await connect(owner.accessToken);
    const ownerPresence = nextMessage(ownerSocket);
    const observerSocket = await connect(observer.accessToken);
    await ownerPresence;

    const forwarded = nextMessage(observerSocket);
    ownerSocket.send(JSON.stringify({
      protocolVersion: 1,
      type: "session_upsert",
      payload: { session: { id: "1" } },
    }));
    await expect(forwarded).resolves.toMatchObject({
      type: "session_upsert",
      senderRole: "owner",
      payload: { session: { id: "1" } },
    });

    const pushTokenForwarded = nextMessage(ownerSocket);
    observerSocket.send(JSON.stringify({
      protocolVersion: 1,
      type: "push_token",
      payload: { token: "ExponentPushToken[test-token]" },
    }));
    await expect(pushTokenForwarded).resolves.toMatchObject({
      type: "push_token",
      senderRole: "observer",
    });

    const forbidden = nextMessage(observerSocket);
    observerSocket.send(JSON.stringify({ protocolVersion: 1, type: "snapshot", payload: { sessions: [] } }));
    await expect(forbidden).resolves.toMatchObject({ type: "error", error: "message_not_allowed" });

    const malformed = nextMessage(ownerSocket);
    ownerSocket.send(JSON.stringify({ protocolVersion: 1, type: "session_upsert" }));
    await expect(malformed).resolves.toMatchObject({ type: "error", error: "invalid_message" });

    const malformedPushToken = nextMessage(observerSocket);
    observerSocket.send(JSON.stringify({
      protocolVersion: 1,
      type: "push_token",
      payload: { token: "not-an-expo-token" },
    }));
    await expect(malformedPushToken).resolves.toMatchObject({
      type: "error",
      error: "invalid_message",
    });

    ownerSocket.close(1000, "test_complete");
    observerSocket.close(1000, "test_complete");
  });

  it("replaces an older connection for the same role", async () => {
    const owner = await login("嘟嘟", testPasswords.owner);
    const firstSocket = await connect(owner.accessToken);
    const closed = nextClose(firstSocket);
    const secondSocket = await connect(owner.accessToken);
    const closeEvent = await closed;
    expect(closeEvent.code).toBe(4001);
    expect(closeEvent.reason).toBe("replaced_by_new_connection");
    secondSocket.close(1000, "test_complete");
  });

  it("closes a connection that exceeds the message limit", async () => {
    const owner = await login("嘟嘟", testPasswords.owner);
    const socket = await connect(owner.accessToken);
    const closed = nextClose(socket);
    socket.send(JSON.stringify({ protocolVersion: 1, type: "snapshot", payload: "x".repeat(66_000) }));
    const closeEvent = await closed;
    expect(closeEvent.code).toBe(1009);
  });

  it("leaves Durable Object storage empty", async () => {
    const owner = await login("嘟嘟", testPasswords.owner);
    const socket = await connect(owner.accessToken);
    const heartbeat = nextMessage(socket);
    socket.send(JSON.stringify({ protocolVersion: 1, type: "heartbeat" }));
    await heartbeat;
    const room = env.ROOMS.get(env.ROOMS.idFromName("dudu-plan"));
    const storedEntries = await runInDurableObject(room, async (_instance, state) => state.storage.list());
    expect(storedEntries.size).toBe(0);
    socket.close(1000, "test_complete");
  });
});
