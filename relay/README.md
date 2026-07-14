# Dudu Plan Relay

Cloudflare Worker + Durable Object relay for the two Dudu Plan roles. Workout data only crosses active WebSocket connections. The Worker does not persist sessions, push tokens, passwords, or message history.

## Local setup

```powershell
cd D:\tt\dudu-plan\relay
npm.cmd install
npm.cmd run check
```

Create `.dev.vars` for local development. Never commit this file:

```dotenv
AUTH_CREDENTIALS={"version":1,"algorithm":"PBKDF2-SHA-256","iterations":210000,"accounts":{...}}
TOKEN_SECRET=replace-with-at-least-32-random-characters
```

Generate the PBKDF2 credential JSON interactively. Password input is hidden:

```powershell
npm.cmd run credentials
```

## Cloudflare deployment

1. Log in and create the two required secrets:

```powershell
npx.cmd wrangler login
npm.cmd run secrets
```

The command reads and confirms both passwords without echoing them, then pipes the PBKDF2 credential JSON and a random signing key directly into Wrangler. Neither secret is printed or written to disk.

2. If Expo Push Security is enabled for the Expo project, add its access token:

```powershell
npx.cmd wrangler secret put EXPO_ACCESS_TOKEN
```

3. Deploy:

```powershell
npm.cmd run deploy
```

Wrangler prints the Worker URL. Configure the mobile app with that HTTPS origin. WebSocket clients connect to `wss://<worker-host>/realtime?access_token=<access-token>`.

## HTTP contract

- `POST /auth/login`: `{ "username": "嘟嘟|肚肚", "password": "..." }`
- `POST /auth/refresh`: `{ "refreshToken": "..." }`
- `GET /realtime`: WebSocket upgrade with an access token in the query or bearer header
- `POST /push`: owner bearer token plus `{ "pushToken", "event": { "id", "type", "title", "body", "data": { "sessionId" } } }`

Both auth endpoints return `{ "role", "accountName", "accessToken", "accessTokenExpiresAt", "refreshToken", "refreshTokenExpiresAt" }`. Expiry fields are Unix epoch milliseconds. Access tokens expire after 15 minutes. Refresh tokens expire after 365 days and rotate whenever `/auth/refresh` succeeds.

## WebSocket protocol

Every client message must contain `protocolVersion: 1` and `type`.

- Owner messages: `snapshot`, `session_upsert`, `heartbeat`
- Observer messages: `push_token`, `heartbeat`
- Server messages: `presence`, `heartbeat`, `error`

Messages are limited to 64 KiB. A new connection replaces the prior connection for the same role. The Durable Object class never calls its storage API, so eviction or restart intentionally discards all relay state.

Push event `type` must be `workout_started` or `workout_completed`. Expo messages use the Android notification channel `observer-updates`. A successful Expo handoff returns `{ "ok": true }`; the Worker never stores the supplied push token.

Use Cloudflare rate limiting or WAF rules on `/auth/login` before wider public distribution. Login failures deliberately return the same response for an unknown account and an incorrect password.
