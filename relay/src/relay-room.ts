import { DurableObject } from "cloudflare:workers";
import { isExpoPushToken } from "./push-token";
import type { AccountRole, Env } from "./types";

const MAXIMUM_MESSAGE_BYTES = 64 * 1_024;
const allowedMessageTypes: Record<AccountRole, ReadonlySet<string>> = {
  owner: new Set(["snapshot", "session_upsert", "heartbeat"]),
  observer: new Set(["push_token", "heartbeat"]),
};

interface ClientMessage {
  protocolVersion: 1;
  type: string;
  [key: string]: unknown;
}

function createPresence(ownerConnected: boolean, observerConnected: boolean): string {
  return JSON.stringify({
    protocolVersion: 1,
    type: "presence",
    roles: { owner: ownerConnected, observer: observerConnected },
    sentAt: new Date().toISOString(),
  });
}

function parseClientMessage(data: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(data) as Partial<ClientMessage>;
    if (parsed.protocolVersion !== 1 || typeof parsed.type !== "string") {
      return null;
    }
    return parsed as ClientMessage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValidPayload(message: ClientMessage): boolean {
  if (message.type === "heartbeat") {
    return true;
  }
  if (!isRecord(message.payload)) {
    return false;
  }
  if (message.type === "snapshot") {
    return Array.isArray(message.payload.sessions) && message.payload.sessions.every(isRecord);
  }
  if (message.type === "session_upsert") {
    return isRecord(message.payload.session);
  }
  if (message.type === "push_token") {
    return isExpoPushToken(message.payload.token);
  }
  return false;
}

// [RelayRoom] Relays transient role-scoped messages. [Warning] Never access Durable Object storage from this class.
export class RelayRoom extends DurableObject<Env> {
  private readonly sockets = new Map<AccountRole, WebSocket>();

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return Response.json({ error: "websocket_required" }, { status: 426 });
    }

    const role = request.headers.get("x-relay-role");
    if (role !== "owner" && role !== "observer") {
      return Response.json({ error: "invalid_role" }, { status: 401 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    const replacedSocket = this.sockets.get(role);
    this.sockets.set(role, server);
    replacedSocket?.close(4001, "replaced_by_new_connection");

    server.addEventListener("message", (event) => this.handleMessage(role, server, event.data));
    server.addEventListener("close", () => this.removeSocket(role, server));
    server.addEventListener("error", () => this.removeSocket(role, server));
    this.broadcastPresence();

    return new Response(null, { status: 101, webSocket: client });
  }

  private handleMessage(role: AccountRole, socket: WebSocket, data: string | ArrayBuffer): void {
    if (typeof data !== "string") {
      socket.close(1003, "text_messages_only");
      return;
    }
    if (new TextEncoder().encode(data).byteLength > MAXIMUM_MESSAGE_BYTES) {
      socket.close(1009, "message_too_large");
      return;
    }

    const message = parseClientMessage(data);
    if (!message) {
      this.sendError(socket, "invalid_message");
      return;
    }
    if (!allowedMessageTypes[role].has(message.type)) {
      this.sendError(socket, "message_not_allowed");
      return;
    }
    if (!hasValidPayload(message)) {
      this.sendError(socket, "invalid_message");
      return;
    }
    if (message.type === "heartbeat") {
      socket.send(JSON.stringify({ protocolVersion: 1, type: "heartbeat", sentAt: new Date().toISOString() }));
      return;
    }

    const targetRole: AccountRole = role === "owner" ? "observer" : "owner";
    const targetSocket = this.sockets.get(targetRole);
    if (targetSocket?.readyState === WebSocket.OPEN) {
      targetSocket.send(JSON.stringify({ ...message, senderRole: role, relaySentAt: new Date().toISOString() }));
    }
  }

  private sendError(socket: WebSocket, error: string): void {
    socket.send(JSON.stringify({ protocolVersion: 1, type: "error", error }));
  }

  private removeSocket(role: AccountRole, socket: WebSocket): void {
    if (this.sockets.get(role) === socket) {
      this.sockets.delete(role);
      this.broadcastPresence();
    }
  }

  private broadcastPresence(): void {
    const presence = createPresence(this.sockets.has("owner"), this.sockets.has("observer"));
    this.sockets.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(presence);
      }
    });
  }
}
