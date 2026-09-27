# Notification WebSocket — Integration Sandbox and Backend Verification

Owner: Goutham Rao Jonpelli
Date: 27 September 2026
Sprint: Sprint 3, Week 3

This document lets any frontend developer start the PHOENIX backend locally and
verify the notification WebSocket without changing frontend code.

It is the backend counterpart to *Notification WebSocket Frontend Integration
Guide*. Where the two disagree, the discrepancies are listed in section 10.

---

## 1. Authoritative backend

| Item | Value |
|---|---|
| Repository | `Hardhat-Enterprises/Phoenix` |
| Branch | `dev-backend` |
| Commit verified | `92ce73e` (*Merge pull request #399*) |
| Verified on | 27 September 2026 |

Branch off current `dev-backend`. Branches created before mid-September may
carry a `libs/common/src/cache/cache.service.ts` that does not compile, which
fails `npm run build:common` and therefore fails every Docker image build. If
your build stops there, your branch is stale — rebase rather than trying to fix
that file.

---

## 2. Required services

All services are defined in `backend/docker-compose.yaml`.

| Container | Image / source | Host port | Container port | Needed for WebSocket testing |
|---|---|---|---|---|
| `phoenix-rabbitmq` | `rabbitmq:4-management` | 5672, 15672 | 5672, 15672 | Yes — carries realtime events |
| `phoenix-redis` | `redis:7` | 6379 | 6379 | Yes — gateway requires it at boot |
| `api-gateway` | `api-gateway/Dockerfile` | **3001** | **3000** | Yes — hosts the WebSocket |
| `user-service` | `user-service/Dockerfile` | 50051 | 50051 | Yes — login and token validation |
| `notification-service` | `notification-service/Dockerfile` | 50052 | 50052 | Yes — notification data |
| `storage-service` | `storage-service/Dockerfile` | 50054 | 50054 | No |
| `data-ingestion-service` | `data-ingestion-service/Dockerfile` | 50053 | 50053 | No — see section 9.3 |

PostgreSQL is **not** a container. The stack connects to a remote Supabase
instance configured in `.env.docker`, so starting the backend requires internet
access and valid database credentials.

---

## 3. Startup

### 3.1 Prerequisites

1. Docker Desktop running.
2. `backend/.env.docker` present.

`.env.docker` is **not** in the repository (it is git-ignored, correctly — it
holds database and JWT secrets). Request it from the backend lead. Without it
`docker compose up` fails immediately with:

```
env file ...\backend\.env.docker not found
```

See recommendation 9.1 for the proposed fix.

### 3.2 Commands

```powershell
cd <repo>/backend
docker compose up -d --build
docker compose ps
```

The first build takes roughly 10 minutes. For the subset needed to test the
WebSocket, excluding the service that currently fails to build:

```powershell
docker compose up -d --build api-gateway user-service notification-service
```

RabbitMQ and Redis start automatically as dependencies.

### 3.3 Confirming a good start

```powershell
docker compose ps
docker logs api-gateway --tail 30
```

A healthy gateway log ends with:

```
RabbitMQ connected
Redis connecting...
Redis ready
[info] [microservices-backend]: Redis connected successfully.
[info] [microservices-backend]: microservices-backend running on port 3000
```

`port 3000` is correct — that is the port *inside* the container. From Windows
you reach it on 3001. See section 4.

Quick check from the host:

```powershell
curl.exe -i http://localhost:3001/
```

`HTTP/1.1 404 Not Found` with `X-Powered-By: Express` is the expected, healthy
response — there is no route at `/`.

### 3.4 Resetting

```powershell
docker compose down -v
```

Always use `-v`. See 9.2 for why.

---

## 4. `localhost:3000` versus `localhost:3001`

`docker-compose.yaml` maps the gateway as `"3001:3000"`, and `.env.docker` sets
`PORT=3000`. The gateway therefore always listens on **3000 inside its own
network namespace**, and Docker publishes that on **3001** of the host.

| How the gateway is started | HTTP base URL | WebSocket URL |
|---|---|---|
| `docker compose up` (normal) | `http://localhost:3001` | `ws://localhost:3001/api/notifications/ws` |
| Directly on the host (`node dist/api-gateway/src/app.js`) | `http://localhost:3000` | `ws://localhost:3000/api/notifications/ws` |
| Another container on the compose network | `http://api-gateway:3000` | `ws://api-gateway:3000/api/notifications/ws` |

**The frontend integration guide specifies `http://localhost:3000`.** That is
correct only for the non-Docker case. Anyone running the stack with
`docker compose` must use **3001**, or every request fails with a connection
error that looks like the backend is down.

Deriving the WebSocket URL from the API base URL, as the guide recommends,
handles this automatically provided `apiBaseUrl` is configured per environment
rather than hard-coded.

---

## 5. Authentication

### 5.1 Obtaining a token

```
POST /api/users/auth/login
Content-Type: application/json

{ "username": "<username>", "password": "<password>" }
```

Response:

```json
{
  "status": 200,
  "message": "...",
  "user_id": "<uuid>",
  "username": "<username>",
  "role": "<role>",
  "access_token": "<jwt>",
  "refresh_token": "<jwt>"
}
```

The field is **`username`, not `email`**. Sending `email` returns
`400 Username and password are required`.

PowerShell:

```powershell
$body = @{ username = "<username>"; password = "<password>" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri http://localhost:3001/api/users/auth/login `
  -Method Post -ContentType "application/json" -Body $body
$token = $login.access_token
```

Never print, log or screenshot the token.

### 5.2 Test accounts

`POST /api/users/auth/register` is guarded by `authorize(["admin"])`, so a
developer cannot create their own account. `database/02_sample_data.sql` seeds
hazards, threats and locations but **no users**.

A test account must be issued by an administrator. This is currently an open
blocker — see section 11.

### 5.3 WebSocket authentication

Implemented in `api-gateway/src/realtime/notification-websocket.ts`.

- Path: `/api/notifications/ws`
- Maximum payload: 16 KiB
- Authentication timeout: **10,000 ms** from connection open
- The token may be sent with or without the `Bearer ` prefix; the gateway strips
  one occurrence. The frontend guide instructs `Bearer ` exactly once — follow
  the guide for consistency.
- Until authenticated, the only accepted message is `authenticate`. Anything
  else returns an error and the socket stays unauthenticated.
- On success the gateway sends `notification:authenticated` and then
  **automatically sends a snapshot** — no subscribe is required.

---

## 6. Generating a test notification

Live `notification:created` events originate from a RabbitMQ **fanout exchange**,
consumed in `api-gateway/src/realtime/notification-realtime-consumer.ts`.

| Item | Value |
|---|---|
| Exchange | `phoenix.notifications.realtime` |
| Type | `fanout`, durable |
| Queue | exclusive, auto-delete, created per gateway instance |
| Acknowledgement | invalid payloads are `nack`ed without requeue and discarded |

### 6.1 Preferred method: publish to the exchange

This works without `data-ingestion-service`, which currently fails to build.

1. Open the RabbitMQ management UI at `http://localhost:15672`. Credentials are
   `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` from `.env.docker`.
2. Exchanges → `phoenix.notifications.realtime` → Publish message.
3. Payload (`user_id` must be the `user_id` from your login response):

```json
{
  "type": "notification.created",
  "notification": {
    "id": "11111111-1111-1111-1111-111111111111",
    "user_id": "<your user_id>",
    "event_id": "22222222-2222-2222-2222-222222222222",
    "event_type": "hazard",
    "title": "Test notification",
    "message": "Generated for WebSocket verification",
    "metadata": "{}",
    "is_read": false,
    "read_at": "",
    "created_at": "2026-09-27T12:00:00.000Z",
    "updated_at": "2026-09-27T12:00:00.000Z",
    "deleted_at": ""
  }
}
```

**Every field is validated and every date field must be a string.** `null` for
`read_at`, `updated_at` or `deleted_at` fails validation and the event is
silently discarded with a warning in the gateway log. Use `""` for absent
timestamps. See finding 9.5.

A published event is broadcast only to sockets currently connected for that
`user_id`. It does **not** create a database row, so it will not appear in a
later snapshot. To test snapshot persistence, create the notification through
the real pipeline instead.

### 6.2 Alternative: the ingestion path

The frontend guide describes creating a critical notification "through the
existing ingestion path". That path requires `data-ingestion-service`, which
does not currently build (see 9.3).

### 6.3 Triggering the other three broadcasts

These are side effects of authenticated REST calls, and each requires an
existing notification row:

| REST call | Broadcast |
|---|---|
| `PATCH /api/notifications/{id}/read` | `notification:updated` |
| `PATCH /api/notifications/read-all` | `notifications:all-read` |
| `DELETE /api/notifications/{id}` | `notification:deleted` |

---

## 7. Message catalogue

All samples below are taken from the implementation. Tokens are redacted.

### 7.1 Client → server

Only two message types are accepted.

**`authenticate`**

```json
{ "type": "authenticate", "token": "Bearer <redacted>" }
```

**`notifications:subscribe`**

```json
{ "type": "notifications:subscribe", "page": 1, "limit": 10, "read": false }
```

Validation: `page` must be an integer ≥ 1; `limit` must be an integer from 1 to
100; `read` must be boolean or omitted. Omitted values keep the current
subscription. Anything invalid returns
`{"type":"error","message":"Invalid notification subscription"}`.

### 7.2 Server → client

**`notification:authenticated`**

```json
{ "type": "notification:authenticated" }
```

**`notifications:snapshot`**

```json
{
  "type": "notifications:snapshot",
  "data": {
    "notifications": [
      {
        "id": "<uuid>",
        "user_id": "<uuid>",
        "event_id": "<uuid>",
        "event_type": "hazard",
        "title": "Severe weather warning",
        "message": "A severe weather warning has been issued.",
        "metadata": "{\"severity\":\"high\"}",
        "is_read": false,
        "read_at": "",
        "created_at": "2026-09-27T12:00:00.000Z",
        "updated_at": "2026-09-27T12:00:00.000Z",
        "deleted_at": ""
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 },
    "unreadCount": 1
  }
}
```

**`notification:created`**

```json
{ "type": "notification:created", "data": { "notification": { "...": "as above" } } }
```

**`notification:updated`**

```json
{ "type": "notification:updated", "data": { "notification": { "...": "as above" } } }
```

**`notifications:all-read`**

```json
{ "type": "notifications:all-read", "data": { "updatedCount": 3 } }
```

**`notification:deleted`**

```json
{ "type": "notification:deleted", "data": { "notificationId": "<uuid>" } }
```

**`error`**

```json
{ "type": "error", "message": "Unauthorized" }
```

Full set of error messages produced by the gateway:

| Message | Cause | Socket closed |
|---|---|---|
| `Message must be a JSON object with a type` | Unparseable JSON, or no string `type` | No |
| `Authenticate before requesting notifications` | Any message other than `authenticate` before authentication | No |
| `Unauthorized` | Token rejected | Yes — 1008 `Unauthorized` |
| `Authentication timed out` | No valid `authenticate` within 10 s | Yes — 1008 `Authentication required` |
| `Unsupported notification WebSocket message` | Unknown `type` after authentication | No |
| `Invalid notification subscription` | `page`, `limit` or `read` out of contract | No |
| `Unable to retrieve notifications` | Snapshot lookup failed downstream | No |

**Payload shape is not uniform.** Six messages wrap their payload in `data`;
`notification:authenticated` has no payload and `error` places `message` at the
top level. A client assuming `message.data` everywhere breaks on those two. This
matches the frontend guide, so it is intended rather than a defect, but it is
easy to get wrong.

`metadata` is always a **JSON-encoded string**, never an object. Parse it
defensively.

---

## 8. Verification procedure

### 8.1 Automated: unauthenticated scenarios

`backend/ws-verify.cjs` (committed with this document) runs the scenarios that
need no account, using Node's built-in WebSocket client — no dependencies.

```powershell
node ws-verify.cjs
```

Verified output, 27 September 2026, against `dev-backend` at `92ce73e`:

```
Connecting to ws://localhost:3001/api/notifications/ws

=== Malformed JSON is rejected safely ===
  received: {"type":"error","message":"Message must be a JSON object with a type"}
  received: {"type":"error","message":"Authentication timed out"}
  closed: code=1008 reason="Authentication required"

=== Subscribe before authenticating is refused ===
  received: {"type":"error","message":"Authenticate before requesting notifications"}
  received: {"type":"error","message":"Authentication timed out"}
  closed: code=1008 reason="Authentication required"

=== Invalid authentication is rejected ===
  received: {"type":"error","message":"Unauthorized"}
  closed: code=1008 reason="Unauthorized"

=== Authentication timeout after 10s of silence ===
  received: {"type":"error","message":"Authentication timed out"}
  closed: code=1008 reason="Authentication required"
```

Note the gateway does not close the socket after a malformed message or a
pre-authentication request; it leaves the 10-second timer running and closes
when that expires. Both errors arrive on the same socket.

### 8.2 Full scenario matrix

| # | Scenario | Procedure | Expected result | Status |
|---|---|---|---|---|
| 1 | Valid authentication | Log in, connect, send `authenticate` with the raw JWT | `notification:authenticated`, then `notifications:snapshot` | Blocked — no test account |
| 2 | Invalid authentication | Send `authenticate` with a junk token | `error` `Unauthorized`, close 1008 | **Verified** |
| 3 | Authentication timeout | Connect and send nothing for 10 s | `error` `Authentication timed out`, close 1008 `Authentication required` | **Verified** |
| 4 | Initial snapshot | Authenticate and send nothing further | `notifications:snapshot` arrives unprompted with `notifications`, `pagination`, `unreadCount` | Blocked |
| 5 | Filtered snapshot | Send `notifications:subscribe` with `page 1`, `limit 10`, `read false` | New snapshot; `pagination` matches request; all items unread | Blocked |
| 6 | Notification creation | Publish to `phoenix.notifications.realtime` (section 6.1) | `notification:created` on every socket for that user | Blocked |
| 7 | Mark-read broadcast | `PATCH /api/notifications/{id}/read` | `notification:updated` with the updated record | Blocked |
| 8 | Mark-all-read broadcast | `PATCH /api/notifications/read-all` | `notifications:all-read` with `updatedCount` | Blocked |
| 9 | Delete broadcast | `DELETE /api/notifications/{id}` | `notification:deleted` with `notificationId` | Blocked |
| 10 | Two sockets, one user | Authenticate two sockets with the same token, then trigger any broadcast | Both receive the identical event | Blocked |
| 11 | User isolation | Authenticate sockets for two different users, trigger a broadcast for one | Only that user's socket receives it | Blocked — needs two accounts |
| 12 | Reconnection recovery | Authenticate, create a notification through the ingestion path, disconnect, reconnect | Next snapshot includes the notification | Blocked |

Scenarios 1 and 4–12 have a documented, repeatable procedure but could not be
executed. The only missing input is a login. See section 11.

### 8.3 What reconnection actually does

Worth stating precisely, because the wording "reconnection returns missed
durable notifications" can be read two ways.

The gateway holds connected sockets in an in-memory `Map` keyed by user id, and
binds an **exclusive, auto-delete** queue to the fanout exchange per instance.
Events published while a client is disconnected are therefore **not replayed** —
the realtime path is fire-and-forget.

Recovery happens instead through the snapshot: on reconnection the gateway reads
the current state from the database and sends it. So a durable notification does
come back, because it is re-read, not because the event was buffered. Anything
that never reached the database — such as a hand-published test event from
section 6.1 — is gone for good.

---

## 9. Findings and recommendations

### 9.1 `.env.docker` is unobtainable from the repository

A fresh clone cannot start the backend at all, and the failure message does not
say where to get the file. This has blocked frontend developers repeatedly.

**Recommendation:** commit `backend/.env.docker.example` containing every key
with placeholder values, and reference it in the backend README. Keep real
values out of the repository.

### 9.2 RabbitMQ fails to start from an orphaned volume

The `rabbitmq` service declares no volume, so Docker creates an anonymous one
for `/var/lib/rabbitmq`. A stale `.erlang.cookie` in that volume, left by an
earlier run, causes:

```
Error when reading /var/lib/rabbitmq/.erlang.cookie: eacces
```

The container exits 1 and, because every other service waits on its health
check, nothing else starts. This presents as "the whole backend is broken".

**Fix:** `docker compose down -v`, then `up`.
**Recommendation:** declare a named volume for RabbitMQ, or document `down -v`
as the standard reset.

### 9.3 `data-ingestion-service` does not build

The image build fails at
`pip install -r /app/libs/common/src/helper/requirements.txt` with exit code 2,
which cancels every other image build in the same `compose up`.

`requirements.txt` pins no versions:

```
joblib
numpy
pandas
xgboost
scikit-learn
```

An unpinned file means the image resolves different versions over time, so a
build that worked previously can fail without any repository change.

**Recommendation:** pin the versions. Until then, start the subset in 3.2.
**Impact on this task:** scenario 12 and the guide's ingestion-based creation
flow cannot be exercised; use section 6.1 instead.

### 9.4 `SWAGGER_SERVER_URL` points at the wrong port

`.env.docker` sets `SWAGGER_SERVER_URL=http://localhost:3000`. Under Docker,
Swagger's "Try it out" therefore calls a port nothing is listening on.
Should be `3001` for the Docker configuration.

### 9.5 Realtime events are dropped when date fields are `null`

`isNotificationRealtimeEvent` requires `read_at`, `updated_at` and `deleted_at`
to be `string`. A producer sending `null` for an unread or never-updated
notification has its event discarded with only a `logger.warn`, and no client
receives the update.

**Recommendation:** confirm with the notification-service author whether the
producer emits `""` or `null`. If `null`, either the producer or the validator
must change.

### 9.6 The gateway does not wait for the gRPC services

`api-gateway` declares `depends_on` for RabbitMQ and Redis only, so it can start
before `user-service` and `notification-service` are accepting connections.
Early requests may fail until those settle. Not fatal, but it explains
intermittent errors immediately after startup.

### 9.7 Scaling limitation for deployment

Connected sockets are held in the memory of a single gateway process, and each
instance binds its own exclusive queue. Broadcasts therefore reach only the
clients attached to the instance that received them — which is correct today
with one instance, but breaks with more than one behind a load balancer.

**Recommendation:** if the gateway is ever scaled out, either use sticky
sessions at the load balancer or move socket state to a shared Redis pub/sub.

### 9.8 Reverse-proxy requirements for deployed WebSockets

A WebSocket begins as an HTTP/1.1 request carrying `Upgrade: websocket`. A proxy
that does not forward that handshake turns every connection attempt into a plain
HTTP response, and the client sees the socket close immediately.

For nginx in front of the gateway:

```nginx
location /api/notifications/ws {
    proxy_pass http://api-gateway:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
    proxy_buffering off;
}
```

Four requirements, each of which breaks the socket if missed:

1. **HTTP/1.1 and the upgrade headers.** `proxy_http_version 1.1` plus the
   `Upgrade` and `Connection` headers. The default HTTP/1.0 cannot carry an
   upgrade.
2. **An idle timeout longer than the quiet periods.** The gateway implements no
   ping/pong heartbeat, so a connection with no notification traffic sends
   nothing at all. A proxy with the common 60-second read timeout will close
   idle sockets, and clients will reconnect in a loop that looks like
   instability. Either raise the timeout, as above, or add a server-side
   heartbeat.
3. **`wss://` behind HTTPS.** A page served over HTTPS cannot open a `ws://`
   socket; browsers block it as mixed content. Deriving the scheme from the API
   base URL, as the frontend guide does, handles this.
4. **Buffering off.** Response buffering delays or breaks the streamed frames.

Managed load balancers need the same treatment: AWS ALB requires an idle timeout
above the quiet period (60 seconds by default), and Cloudflare proxies
WebSockets but applies its own inactivity limits.

If the gateway is ever run as more than one replica, see 9.7 — the proxy must
also pin each client to one instance, or broadcasts will reach only some
clients.

---

## 10. Differences from the frontend integration guide

The implementation matches the guide on all nine message types, the 10-second
timeout, close code 1008, and the REST-mutation-plus-WebSocket-event model. Two
differences matter:

1. **Base URL.** The guide states `apiBaseUrl = http://localhost:3000`. That
   applies only when the gateway runs outside Docker. With `docker compose` the
   correct value is `http://localhost:3001` (section 4).
2. **Notification creation.** The guide's verification flow says to "create a
   critical notification through the existing ingestion path". That path is
   unavailable while `data-ingestion-service` fails to build; use the RabbitMQ
   publish method in section 6.1.

One clarification: the guide says to send `Bearer ` exactly once. The gateway
also accepts a bare token. Follow the guide.

---

## 11. Open items

| Item | Blocks | Owner |
|---|---|---|
| A test account (username and password) | Scenarios 1, 4–10, 12 | Backend lead / an administrator |
| A second test account | Scenario 11 (user isolation) | Backend lead / an administrator |
| `data-ingestion-service` build failure | Scenario 12 via the documented ingestion path | Backend team |
| Whether the producer sends `""` or `null` for absent dates | Finding 9.5 | notification-service author |

Everything else required by this task is complete: the backend starts from
documented steps, the address confusion is resolved, all nine messages are
documented against the implementation, and the verification procedure is
repeatable. Scenarios 2 and 3 are verified with captured output; the remaining
ten have a written procedure and need only a login to execute.

---

## Appendix A — Evidence captured

| Evidence | Where |
|---|---|
| Startup — `docker compose ps`, all five containers up | Screenshot, 27 Sep 2026 22:22 |
| Gateway log — RabbitMQ and Redis connected, running on port 3000 | Screenshot, 27 Sep 2026 22:24 |
| Host reachability — `curl http://localhost:3001/` returning Express 404 | Screenshot, 27 Sep 2026 22:23 |
| Invalid token and timeout behaviour | `node ws-verify.cjs` output, section 8.1 |
| RabbitMQ cookie failure and recovery | `docker logs phoenix-rabbitmq`, 27 Sep 2026 22:19–22:21 |
| Authoritative commit | `git log --oneline -3` → `92ce73e` |

No tokens or credentials appear in any captured evidence.