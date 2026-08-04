# CY017 — Reusable Security Logging Module

TypeScript implementation of the Project Phoenix security logging module.

Integrated into the live backend on 29 Jul 2026. It is exported from
`@phoenix/common`, so any service imports it the same way it imports `logger` or
`HttpStatusCode`:

```ts
import { fromRequest, logRbacDenied } from "@phoenix/common";
```

See [Live call sites](#live-call-sites) for what is currently instrumented and
[How to verify](#how-to-verify) for the commands that exercise each event.

## Files

| File | Purpose |
|---|---|
| `securityLogTypes.ts` | Typed union types for event types, severity, outcome, rules, reason sub-classifiers, and the `SecurityLogRecord` shape. |
| `logTransport.ts` | `LogTransport` interface, default `ConsoleJsonTransport`, and `NullTransport` for tests. |
| `expressLogContext.ts` | `fromRequest(req)` extracts `ip_address`, `endpoint`, `method`, `user_id`, `role`, and `request_id` from an Express request. |
| `grpcLogContext.ts` | `fromGrpcMetadata(metadata)` reconstructs the same context inside a gRPC service, from metadata the api-gateway attaches. Added during integration — see [Crossing the gRPC boundary](#crossing-the-grpc-boundary). |
| `securityLogger.ts` | Core `logSecurityEvent()` plus eight typed helper functions. |
| `index.ts` | Convenience re-export file. |

## Helper functions

| Helper | Event type | Reason values |
|---|---|---|
| `logAuthFailure` | `auth_failure` | `bad_password`, `unknown_user`, `account_locked`, `lockout_active` |
| `logTokenInvalid` | `token_invalid` | `expired`, `malformed`, `bad_signature`, `tampered_claims`, `refresh_expired`, `refresh_replay` |
| `logTokenIssued` | `token_issued` | none |
| `logRbacDenied` | `rbac_denied` | none |
| `logValidationFailure` | `validation_failure` | `missing_field`, `invalid_type`, `invalid_enum`, `length_exceeded`, `bad_format`, `size_exceeded` |
| `logRateLimitExceeded` | `rate_limit_exceeded` | `rate_limit_hit`, `throttled` |
| `logDuplicateAlert` | `duplicate_alert` | none |
| `logAccessRestricted` | `access_restricted` | Sync: `authentication_failure`, `rate_limit_hit`, `throttling`, `duplicate_request`; Async: `repeated_rate_limit_hit`, `repeated_throttling`, `repeated_duplicate_request`, `repeated_invalid_input`, `repeated_authentication_failure`, `repeated_rbac_denied`, `sustained_abuse_pattern` |

## Output format

The module creates structured JSON records. The default transport prints each record as one line:

```ts
console.log(JSON.stringify(record));
```

That means the current output is NDJSON: newline-delimited JSON. `console.log` is only the temporary output method; the log format is still structured JSON.

## Running the demo

From the `Logging module/` root directory:

```bash
npm install && npm run demo
```

## Quick start

```ts
import { fromRequest } from './expressLogContext';
import { logAuthFailure } from './securityLogger';

const ctx = fromRequest(req);

logAuthFailure({
  ...ctx,
  reason: 'unknown_user',
  details: { attempted_username: 'example@example.com' },
});
```

## Transport replacement

When database, SIEM, Winston, Pino, or multi-output logging is added later, implement `LogTransport` and set it once at startup:

```ts
import { setLogTransport } from './securityLogger';
import { MyDatabaseTransport } from './myDatabaseTransport';

setLogTransport(new MyDatabaseTransport());
```

Existing middleware and handlers do not need to change.


## Live call sites

Instrumented as of 29 Jul 2026. Every response body and status code is unchanged
from before integration — logging observes decisions, it does not make them.

| Event | Reason | Where | Trigger |
|---|---|---|---|
| `token_issued` | — | `api-gateway` `user.controller.ts` `login` / `refresh` | successful login or token refresh |
| `auth_failure` | `unknown_user` | `user-service` `user.service.ts` `loginUser` | username not in `user_account` |
| `auth_failure` | `bad_password` | `user-service` `user.service.ts` `loginUser` | username exists, bcrypt compare fails |
| `validation_failure` | `missing_field` | `user-service` `user.service.ts` `loginUser` | username or password absent |
| `rbac_denied` | — | `api-gateway` `auth.middleware.ts` `authorize` | role not in the route's allowed roles |
| `rbac_denied` | — | `api-gateway` `auth.middleware.ts` `authorizeSelfOrRoles` | neither role nor self-access permits it |
| `token_invalid` | `expired` / `malformed` / `bad_signature` | `api-gateway` `auth.middleware.ts` `authenticate` | `jwt.verify` throws; reason mapped from the JWT error |
| `access_restricted` | `authentication_failure` | `api-gateway` `auth.middleware.ts` `authenticate` | no `Authorization` header, or token superseded/revoked |

Not yet instrumented, because the control being logged does not exist in the
codebase yet: `rate_limit_exceeded` (no rate limiter), `duplicate_alert` (no
Alert entity), and the asynchronous `access_restricted` reasons (need the
persistent-violation monitor, which needs a store — Redis is configured but
unused).

## Anti-enumeration and where an event is logged

`unknown_user` and `bad_password` are deliberately logged in **user-service**,
not in the api-gateway. The login endpoint returns the identical message
`"Invalid username or password"` for both cases so the API cannot be used to
discover which usernames exist — which means the gateway genuinely does not know
which of the two happened. Only user-service does.

The API response stays generic; only the log is precise. That is the point: the
security value lives in the log, not in the response.

## Crossing the gRPC boundary

Logging inside user-service creates a problem: gRPC request messages carry no
caller context, so a record logged there would have no client IP and no
correlation ID.

Rather than add fields to the shared `.proto` files (which other workstreams
depend on), the api-gateway attaches the context as **gRPC metadata** — the
transport-level key/value channel that exists for exactly this purpose. It needs
no schema change and is ignored by any service that does not read it.

```
api-gateway                                  user-service
  buildSecurityMetadata(req)  ──metadata──▶   fromGrpcMetadata(call.metadata)
  x-forwarded-for, x-request-id,              → { ip_address, endpoint,
  x-original-endpoint, x-original-method         method, request_id, ... }
```

The result is that an `auth_failure` logged inside user-service still reports
`"ip_address": "::1"` and `"endpoint": "/api/users/auth/login"` — the real client
and the real HTTP endpoint, not `grpc:LoginUser`.

`fromGrpcMetadata` types its argument structurally (anything with `get(key)`)
rather than importing `@grpc/grpc-js`, so this module stays framework-agnostic
and can be unit-tested with a plain object.

## Correlation IDs

`attachRequestId` (`api-gateway/src/middleware/request-id.middleware.ts`) gives
every request an `x-request-id`, preserving an inbound one if present and
generating a UUID otherwise. It is echoed on the response.

Without it, `request_id` would only be populated when a caller happened to send
the header, which defeats the purpose — a single request can produce several
records across two services, and the correlation ID is what ties them together.

## How to verify

With the stack running (`docker compose up -d` in `backend/`) and a test account
seeded (see `backend/database/seed_security_test_users.sql`):

```bash
# auth_failure / unknown_user
curl -s -X POST localhost:3001/api/users/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"ghost_user","password":"x"}'

# rbac_denied — analyst hitting an admin-only route
TOKEN=$(curl -s -X POST localhost:3001/api/users/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"isa_sec_analyst","password":"<password>"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
curl -s localhost:3001/api/users/user -H "Authorization: Bearer $TOKEN"

# token_invalid / malformed
curl -s localhost:3001/api/users/meta/seasons -H 'Authorization: Bearer nope'

# access_restricted / authentication_failure
curl -s localhost:3001/api/users/meta/seasons
```

Then read the records back:

```bash
docker logs api-gateway 2>&1 | grep '^{"timestamp"'
docker logs user-service 2>&1 | grep '^{"timestamp"'
```

## Safety notes

- The logger records security decisions; it does not make blocking or detection decisions itself.
- It does not write to a database, SIEM, dashboard, or remote service in this phase.
- It does not aggregate repeated events across windows; the async monitor will consume these records later.
- The `details` field is sanitised: control characters are removed, long strings are truncated, circular references are handled, and sensitive keys such as passwords, tokens, secrets, cookies, authorization headers, and raw request bodies are redacted.
- No security log record contains a JWT. Before this integration, `user.handler.ts` logged whole auth responses with `JSON.stringify(response)`, which printed freshly minted access and refresh tokens in plaintext on every successful login and refresh. That is now `summariseAuthResponse()`, which emits an allowlist of safe fields and reports token presence as a boolean. An allowlist rather than a denylist, so a field added to `AuthEntity` later cannot leak by default.
