import { jsonResponse, readJsonBody } from "./http";
import { isExpoPushToken } from "./push-token";
import type { Env } from "./types";

interface WorkoutPushEvent {
  body: string;
  data: { sessionId: string };
  id: string;
  title: string;
  type: "workout_started" | "workout_completed";
}

interface PushRequest {
  event: WorkoutPushEvent;
  pushToken: string;
}

const identifierPattern = /^[A-Za-z0-9._:-]{1,128}$/u;

function isPushRequest(value: unknown): value is PushRequest {
  if (!value || typeof value !== "object") {
    return false;
  }
  const request = value as Partial<PushRequest>;
  const event = request.event as Partial<WorkoutPushEvent> | undefined;
  return (
    isExpoPushToken(request.pushToken) &&
    Boolean(event) &&
    typeof event?.id === "string" &&
    identifierPattern.test(event.id) &&
    (event.type === "workout_started" || event.type === "workout_completed") &&
    typeof event.title === "string" &&
    event.title.trim().length >= 1 &&
    event.title.length <= 80 &&
    typeof event.body === "string" &&
    event.body.trim().length >= 1 &&
    event.body.length <= 180 &&
    Boolean(event.data) &&
    typeof event.data?.sessionId === "string" &&
    identifierPattern.test(event.data.sessionId)
  );
}

function createExpoMessage(request: PushRequest): Record<string, unknown> {
  return {
    to: request.pushToken,
    sound: "default",
    priority: "high",
    channelId: "observer-updates",
    title: request.event.title.trim(),
    body: request.event.body.trim(),
    data: {
      ...request.event.data,
      eventId: request.event.id,
      type: request.event.type,
    },
  };
}

function getExpoPushTicket(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || !("data" in value)) {
    return null;
  }
  const data = (value as { data: unknown }).data;
  const ticket = Array.isArray(data) ? data[0] : data;
  return ticket && typeof ticket === "object" && !Array.isArray(ticket)
    ? ticket as Record<string, unknown>
    : null;
}

export async function sendWorkoutPush(request: Request, env: Env): Promise<Response> {
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }
  if (!isPushRequest(body)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const headers = new Headers({
    accept: "application/json",
    "accept-encoding": "gzip, deflate",
    "content-type": "application/json",
  });
  if (env.EXPO_ACCESS_TOKEN) {
    headers.set("authorization", `Bearer ${env.EXPO_ACCESS_TOKEN}`);
  }

  let expoResponse: Response;
  try {
    expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers,
      body: JSON.stringify(createExpoMessage(body)),
    });
  } catch {
    return jsonResponse({ error: "push_provider_unavailable" }, 502);
  }
  if (!expoResponse.ok) {
    return jsonResponse({ error: "push_provider_error", providerStatus: expoResponse.status }, 502);
  }
  const expoResponseBody = await expoResponse.json().catch(() => null);
  const ticket = getExpoPushTicket(expoResponseBody);
  if (!ticket || ticket.status !== "ok" || typeof ticket.id !== "string") {
    return jsonResponse({ error: "push_provider_rejected" }, 502);
  }
  return jsonResponse({ ok: true }, 202);
}
