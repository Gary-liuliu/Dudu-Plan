const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-origin": "*",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

export function methodNotAllowed(): Response {
  return jsonResponse({ error: "method_not_allowed" }, 405);
}

export function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
    webSocket: response.webSocket,
  });
}

export async function readJsonBody(request: Request, maximumBytes = 8_192): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maximumBytes) {
    throw new Error("payload_too_large");
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > maximumBytes) {
    throw new Error("payload_too_large");
  }

  return JSON.parse(rawBody);
}
