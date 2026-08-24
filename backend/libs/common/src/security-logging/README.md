# Security Monitoring & Audit Logging Implementation v1.1

**Area 5 - Cybersecurity stream.** First fully working implementation, proposed for merge into `dev`.

Structured, machine-readable logging for security-relevant events: authentication
attempts, authorisation failures and token validation. Records are emitted as one JSON
object per line through the team's existing Winston logger.

---

## 1. Impact on existing behaviour

**No change to how the application behaves.**

- **No HTTP status code, response body, route or middleware order changed.** Every logging
  call is inserted immediately *before* an existing `return res.status(...)`. The API
  contract is byte-for-byte identical.
- **No `.proto` file, database schema, environment variable or dependency added.**
  Everything uses Node built-ins and the Winston version already in `package.json`.
- **Existing `logger.*` calls behave exactly as before.** `logger.ts` was modified, but its
  output for every existing call shape is unchanged, including calls that pass a second
  metadata argument.
- **No other team member's logic was altered.** Only log calls were added.

---

## 2. The module

At `backend/libs/common/src/security-logging/`, exported through `@phoenix/common` in the
same way the shared `logger` and `HttpStatusCode` already are.

| File | Lines | Role |
|---|---|---|
| `securityLogTypes.ts` | 237 | **Vocabulary.** Event types, severities, outcomes, reason sub-classifiers and the `SecurityLogRecord` shape - typed unions, so an invalid event name will not compile. |
| `securityLogger.ts` | 390 | **Core.** `logSecurityEvent()` plus eight typed helpers, one per event type. Applies per-event defaults and runs the sanitiser. |
| `expressLogContext.ts` | 58 | **Context.** `fromRequest(req)` extracts `ip_address`, `endpoint`, `method`, `user_id`, `role`, `request_id`. |
| `grpcLogContext.ts` | 92 | Same for gRPC calls. Present but not yet used - see §7. |
| `logTransport.ts` | 28 | **Delivery interface.** One method (`emit(record)`) plus a console implementation. |
| `winstonTransport.ts` | 130 | **Adapter.** Delivers records through the shared Winston logger. |

### Design principle

The module separates two jobs usually tangled together: **producing** a record (what
happened, which fields describe it - this module) and **delivering** it (console, file,
database, SIEM - Winston). `LogTransport` is the boundary:

```ts
export interface LogTransport {
  emit(record: SecurityLogRecord): void;
}
```

Anything with an `emit` method can be a destination, so changing where logs go is one line
at service startup - no call site changes.

### Safety properties

- **Redaction is centralised.** `sanitiseDetails()` runs inside `logSecurityEvent()`, before
  any transport sees the data. It redacts sensitive keys (`password`, `token`, `jwt`,
  `authorization`, `cookie`, `secret`, `credential` and others), strips control characters,
  truncates long strings, caps nesting depth and handles circular references. No transport
  can bypass it.
- **No secret is ever recorded.** Passwords, token values and `Authorization` headers are
  never passed to the logger and would be redacted if they were.
- **`endpoint` records the route template** (`/api/users/auth/logout/:userId`), not the
  concrete URL, so identifiers do not leak into that field. Where a target ID matters it is
  recorded explicitly in `details`.

---

## 3. How a record is produced

An analyst calls the admin-only `GET /api/users/user`.

**1) Call site.** `authorize()` finds the role is wrong:

```ts
logRbacDenied({
  ...fromRequest(req),
  details: { required_roles: roles, actual_role: user?.role ?? null, check: "roles" },
});
```

**2) Typed helper.** `logRbacDenied()` fills in what an RBAC denial means: `severity: medium`,
`outcome: blocked`, `response_code: 403` and the rule tag. All overridable, so call sites
stay short.

**3) Core builder.** `logSecurityEvent()` stamps timestamp and component, sanitises
`details`, drops `undefined` fields and hands the record to the active transport.

**4) Delivery.** `WinstonTransport` translates it into a Winston call; Winston formats and
writes it.

```
authorize()                            decides
  └─ logRbacDenied()                   classifies
       └─ logSecurityEvent()           builds + sanitises
            └─ activeTransport.emit()  ← the seam
                 └─ WinstonTransport   translates
                      └─ logger.log()  Winston → stdout
```

**Resulting record:**

```json
{
  "timestamp": "2026-08-24T13:08:02.076Z",
  "component": "api-gateway",
  "event_type": "rbac_denied",
  "severity": "medium",
  "outcome": "blocked",
  "user_id": "6b060193-1402-4682-9bde-03df00f7a07f",
  "role": "analyst",
  "ip_address": "::ffff:192.168.65.1",
  "endpoint": "/api/users/user",
  "method": "GET",
  "response_code": 403,
  "rule_triggered": "CY010 Rule 2 - Role-Based Access Restriction",
  "request_id": "55513429-6bd0-485d-85d9-e33a926bf770",
  "details": {
    "required_roles": ["admin"],
    "actual_role": "analyst",
    "check": "roles"
  },
  "level": "warn",
  "message": "rbac_denied | required_roles=admin actual_role=analyst check=roles"
}
```

Emitted as a single line; shown formatted here.

---

## 4. Relationship with the existing Winston logger

Winston is **not replaced**. It is now the delivery mechanism for security records as well as
operational ones - one logger, one place to configure where output goes.

| | Security logging module | Winston |
|---|---|---|
| Decides | which fields a record has, which values are legal, what gets redacted | where the line is written, at what level |
| Owns | schema, vocabulary, sanitisation | transports, filtering, formatting |

Records carry both `severity` (the security judgement, `low` … `critical`) and `level`
(Winston's operational level). These are deliberately separate: a SIEM rule filters on
`severity`, Winston's routing works off `level`.

Adding durable storage or a SIEM feed is therefore a single change in `logger.ts`, covering
both streams:

```ts
transports: [
  new winston.transports.Console(),
  new winston.transports.File({ filename: "/var/log/phoenix/security.log" }),
]
```

No change to the module, no change to any call site.

---

## 5. Changes outside the module

Six files, all additive.

### `libs/common/src/config/logger.ts` - the one shared file with a behavioural change

The Winston format previously destructured four fields and discarded the rest, which would
have flattened a structured record into a single string. It now branches:

```ts
winston.format.printf((info) => {
  if ((info as Record<symbol, unknown>)[SECURITY_EVENT]) {
    return JSON.stringify(info);        // security record → NDJSON
  }

  const { level, message, timestamp, service } = info;
  return `[${timestamp}] [${level}] [${service}]: ${message}`;   // unchanged
})
```

- The `else` branch is **character-for-character the original function body**, so existing
  operational output is unaffected.
- The branch triggers only on a symbol created via `Symbol.for("phoenix.security_event")`,
  which only `WinstonTransport` sets. Another service's metadata object cannot trigger it by
  accident - symbols are never produced by JSON parsing, gRPC responses or object literals.
- Symbol keys are ignored by `JSON.stringify`, so the marker routes the record without
  appearing in the output.
- `defaultMeta`, `level` and `transports` are untouched.

### `api-gateway/src/middleware/request-id.middleware.ts` - new file

Assigns one correlation identifier per incoming HTTP request, so all records from that
request can be tied together. `fromRequest()` already reads `x-request-id`, so the middleware
writes back into `req.headers` and the module needs no change.

A caller-supplied ID is honoured only if it matches `^[A-Za-z0-9._-]{8,64}$`; anything else is
replaced with a generated UUID. Since the value is written verbatim into audit records, this
prevents an unbounded or deliberately colliding identifier entering the log. The ID is also
returned in the response header.

### The five `app.ts` files - two lines each

Each service declares its identity and delivery mechanism at startup:

```ts
setDefaultComponent("api-gateway");          // names this service in every record
setLogTransport(new WinstonTransport());     // routes records through Winston
```

`api-gateway/src/app.ts` additionally registers the correlation-ID middleware first in the
chain, so an identifier exists before any route or auth check runs:

```ts
app.use(attachRequestId);
```

`data-ingestion-service`, `storage-service` and `notification-service` emit no security
records yet - their lines are inert, present so records are attributed correctly the moment
anyone instruments them.

`setDefaultComponent` is explicit rather than environment-derived because `docker-compose.yaml`
uses a single shared `.env.docker` for all services, so one variable cannot hold a different
value per service.

---

## 6. What is wired and where

Seven call sites across two services, producing nine distinct record types

### `rbac_denied` - role-based authorisation denied

| Call site | Middleware | Service | Reason | Fires when |
|---|---|---|---|---|
| `auth.middleware.ts` | `authorize()` | api-gateway | *(none)* | Token valid, role not in the permitted list |
| `auth.middleware.ts` | `authorizeSelfOrRoles()` | api-gateway | *(none)* | Neither the role check nor the self-access check passed |

`rbac_denied` carries no reason sub-classifier; `details.check` distinguishes the two
(`"roles"` / `"self_or_roles"`) and the second also records `requested_user_id`.

### `access_restricted` - request refused before authorisation

| Call site | Middleware | Service | Reason | Fires when |
|---|---|---|---|---|
| `auth.middleware.ts` | `authenticate()` | api-gateway | `authentication_failure` | No `Authorization` header |
| `auth.middleware.ts` | `authenticate()` | api-gateway | `authentication_failure` | Token valid but the account no longer exists |
| `auth.middleware.ts` | `authenticate()` | api-gateway | `authentication_failure` | Signature valid but token no longer matches the account - logout, newer login or replay. Severity `high` |

All three share one reason; `details.cause` distinguishes them
(`missing_authorization_header` / `user_not_found` / `token_no_longer_matches_account`).

### `token_invalid` - JWT verification failed

| Call site | Middleware | Service | Reason | Fires when |
|---|---|---|---|---|
| `auth.middleware.ts` | `authenticate()` catch block | api-gateway | `expired` / `malformed` / `bad_signature` | Access token past its expiry, not a parseable JWT, or signature does not verify |
| `user.service.ts` | `refreshToken()` catch block | user-service | `refresh_expired` | Refresh token past its expiry |

A helper maps the `jsonwebtoken` error to the reason vocabulary, because **severity is assigned
by reason**: an expired token is routine (`low`), a bad signature is a probable forgery attempt
(`high`).

---

## 7. Known limitations

- **`user-service` records carry no client IP or correlation ID.** gRPC calls carry no HTTP
  headers, so `refresh_expired` uses a static fallback (`ip_address: "unknown"`,
  `endpoint: "grpc:RefreshToken"`). `grpcLogContext.ts` exists to close this via gRPC metadata;
  it needs coordination with the API/Auth areas and is not yet wired.
- **`LOG_LEVEL` now affects security logging.** It defaults to `info`, so all records pass
  today. Raised to `warn`, `info`-severity records would be dropped silently.
- **Records go to stdout only** and are lost when a container is recreated. A File transport is
  the next step - see §4.
- **Not yet instrumented:** `token_issued`, `auth_failure`, `validation_failure`.
  `rate_limit_exceeded` and `duplicate_alert` are blocked until a rate limiter and an Alert
  entity exist.

---

## 8. How to verify

```bash
cd backend
docker compose build && docker compose up -d

# security records only
docker logs -f api-gateway 2>&1 | grep --line-buffered '^{' | jq .
```

| Test | Expected response | Expected record |
|---|---|---|
| Analyst token → `GET /api/users/user` | 403 `Access denied` | 1 × `rbac_denied`, `check: "roles"` |
| **Admin token → same route** | not 403 | **none** |
| Analyst → `POST /api/users/auth/logout/<other user id>` | 403 | 1 × `rbac_denied`, `check: "self_or_roles"` |
| No `Authorization` header → `GET /api/users/user` | 401 `No token provided` | 1 × `access_restricted`, `cause: missing_authorization_header` |
| Log out, then reuse the old token | 401 `Logged out` | 1 × `access_restricted`, `cause: token_no_longer_matches_account`, severity `high` |
| `Authorization: Bearer notatoken` | 401 `Invalid token` | 1 × `token_invalid`, `malformed` |
| Valid token with characters appended | 401 | 1 × `token_invalid`, `bad_signature`, severity `high` |
| Expired refresh token → `/auth/refresh` | 401 | 1 × `token_invalid`, `refresh_expired` - in **user-service** logs |

The admin case is the control: no record confirms that successful authorisation is not logged
as a denial.

Finally, confirm the change to `logger.ts` did not affect other services' logging. The tests
above filter to JSON records only, so view the unfiltered log and check that ordinary
operational lines still print in their original plaintext format:

```bash
docker logs api-gateway --tail 40
```

```
[2026-08-24T02:11:04.220Z] [info] [microservices-backend]: LoginUser response: ...
```
