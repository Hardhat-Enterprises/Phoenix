# Security Logging Module (CY017)

Structured security-event logging for the Phoenix backend. The module records security decisions made by other controls (authentication, authorisation, token checks, rate limiting) as one JSON object per line, ready for monitoring, investigation and a future SIEM.

The module records decisions. It never makes them: no status code, response or control flow changes when a record is written.

## Features

- **Typed event schema.** Event types, reasons, severities, outcomes and rule names are TypeScript unions, so an invalid value does not compile.
- **One helper per event type.** Each helper fills in sensible defaults (severity, outcome, response code, rule), so call sites stay short.
- **Severity by reason.** For example, an expired token is `low` but a bad signature is `high`.
- **Central sanitisation.** Sensitive keys are redacted, control characters stripped, long strings truncated, nesting depth capped and circular references handled, before any output sees the data.
- **Request correlation.** Every record carries a `request_id`, which is also passed to downstream gRPC services.
- **Service attribution.** Every record names the service that produced it (`component`).
- **Pluggable delivery.** Records are produced by the module and delivered by a transport. The default transport sends them through the shared Winston logger.
- **Persistent audit file.** Security records (and only security records) are also written to `logs/security.log`.

## Module Structure

```
libs/common/src/security-logging/
├── securityLogTypes.ts     Schema: event types, reasons, severities, outcomes, rules, record shape
├── securityLogger.ts       Core: logSecurityEvent(), typed helpers, per-reason defaults, sanitiser
├── expressLogContext.ts    fromRequest(req): context from an Express request
├── grpcLogContext.ts       fromGrpcMetadata(): context passed to gRPC services as metadata
├── logTransport.ts         LogTransport interface (the delivery boundary) and ConsoleJsonTransport
├── winstonTransport.ts     WinstonTransport: delivers records through the shared Winston logger
└── index.ts                Exports everything through @phoenix/common
```

Related files outside the module:

| File | Role |
|---|---|
| `libs/common/src/config/logger.ts` | Writes security records as JSON and also to the audit file. Other log lines keep their original format |
| `api-gateway/src/middleware/request-id.middleware.ts` | Assigns each request a correlation ID |
| Each service's `app.ts` | Names the service and selects the Winston transport at startup |

## Execution Flow

```
Control makes a decision (e.g. authorize() denies an analyst)
  └─ logRbacDenied({ ...fromRequest(req), details })     helper adds event defaults
       └─ logSecurityEvent()                             adds timestamp + component, sanitises details
            └─ WinstonTransport.emit()                   maps severity to a Winston level
                 └─ logger.log()                         Console (JSON line) + logs/security.log
```

Across services, the gateway passes request context to user-service as gRPC metadata:

```
api-gateway: fromRequest(req) → Metadata (ip, endpoint, method, request_id)
  └─ gRPC LoginUser
       └─ user-service: fromGrpcMetadata(call.metadata) → logAuthFailure({ ...context, reason })
```

## Usage

At service startup (already done in all five services):

```ts
import { setDefaultComponent, setLogTransport, WinstonTransport } from "@phoenix/common";

setDefaultComponent("api-gateway");
setLogTransport(new WinstonTransport());
```

At a call site, log just before the existing response:

```ts
import { fromRequest, logRbacDenied } from "@phoenix/common";

logRbacDenied({
  ...fromRequest(req),
  details: { required_roles: roles, actual_role: user?.role ?? null, check: "roles" },
});
return res.status(403).json({ message: "Access denied" });
```

In a gRPC service, read the context the gateway passed:

```ts
const context = fromGrpcMetadata(call.metadata, { fallbackEndpoint: "grpc:LoginUser" });
logAuthFailure({ ...context, reason: "unknown_user", details: { attempted_username } });
```

Available helpers: `logAuthFailure`, `logTokenInvalid`, `logTokenIssued`, `logRbacDenied`, `logValidationFailure`, `logRateLimitExceeded`, `logDuplicateAlert`, `logAccessRestricted`, and the underlying `logSecurityEvent`. Any default can be overridden by passing the field.

## Record Format

| Field | Description |
|---|---|
| `timestamp` | UTC, ISO 8601 |
| `component` | Service that produced the record |
| `event_type` | One of the event types below |
| `severity` | `info`, `low`, `medium`, `high` or `critical` |
| `outcome` | For example `blocked`, `failure`, `success` |
| `user_id`, `role` | Actor, when known |
| `ip_address`, `endpoint`, `method` | Request context. `endpoint` is the route template, not the concrete URL |
| `response_code` | HTTP status returned to the client |
| `rule_triggered` | Security rule the decision enforces |
| `request_id` | Correlation ID |
| `reason` | Reason within the event type |
| `details` | Extra context, sanitised |
| `level`, `message` | Added by Winston (`critical`/`high` → `error`, `medium` → `warn`, others → `info`) |

Example (one line in the log, formatted here):

```json
{
  "timestamp": "2026-09-25T01:14:45.231Z",
  "component": "user-service",
  "event_type": "auth_failure",
  "severity": "medium",
  "outcome": "failure",
  "user_id": "6b060193-…",
  "role": "analyst",
  "ip_address": "::ffff:192.168.65.1",
  "endpoint": "/api/users/auth/login",
  "method": "POST",
  "response_code": 401,
  "rule_triggered": "CY010 Rule 1 - Authentication Required",
  "request_id": "cy017-20260925-111431-07",
  "reason": "bad_password",
  "details": { "attempted_username": "analyst_test1" },
  "level": "warn",
  "message": "auth_failure | bad_password | attempted_username=analyst_test1"
}
```

## Events and Integration Points

| Event | Reasons in use | Call site | Service |
|---|---|---|---|
| `rbac_denied` | none (`details.check` = `roles` or `self_or_roles`) | `auth.middleware.ts`: `authorize()`, `authorizeSelfOrRoles()` | api-gateway |
| `access_restricted` | `authentication_failure` (`details.cause` = `missing_authorization_header`, `non_bearer_authorization_scheme`, `user_not_found`, `token_no_longer_matches_account`) | `auth.middleware.ts`: `authenticate()` | api-gateway |
| `token_invalid` | `expired`, `malformed`, `bad_signature` | `auth.middleware.ts`: `authenticate()` | api-gateway |
| `token_invalid` | `refresh_expired` | `user.service.ts`: `refreshToken()` | user-service |
| `token_issued` | none (`details.grant_type` = `password` or `refresh_token`) | `user.controller.ts`: `login()`, `refresh()` | api-gateway |
| `auth_failure` | `unknown_user`, `bad_password` | `user.service.ts`: `loginUser()` | user-service |
| `rate_limit_exceeded` | `rate_limit_hit` | `rateLimit.middleware.ts`: `loginRateLimiter` | api-gateway (not yet attached to a route) |

Defined in the schema but not yet wired: `validation_failure`, `duplicate_alert`, `auth_failure` (`account_locked`, `lockout_active`), `token_invalid` (`tampered_claims`, `refresh_replay`) and the repeated-violation reasons of `access_restricted`. Most depend on controls that do not exist yet.

## Configuration

| Setting | Default | Purpose |
|---|---|---|
| `setDefaultComponent(name)` | `SERVICE` env, else `phoenix-backend` | Service name on every record |
| `setLogTransport(transport)` | `ConsoleJsonTransport` | Where records are delivered |
| `SECURITY_LOG_PATH` | `logs/security.log` | Audit file path |
| `LOG_LEVEL` | `info` | Winston level. Setting it to `warn` would drop `info` records such as `token_issued` |

The audit file lives inside the container (`/app/logs/security.log`). It survives a restart, but not a rebuild. `logs/` is gitignored.

## Security Considerations

- Passwords, token values and `Authorization` headers are never passed to the logger, and would be redacted if they were.
- Redacted keys include `password`, `token`, `jwt`, `authorization`, `cookie`, `secret`, `apikey`, `credential`, `refreshtoken`, `accesstoken` and raw request bodies.
- A caller-supplied `x-request-id` is only accepted if it matches `^[A-Za-z0-9._-]{8,64}$`. Otherwise a UUID is generated. This stops log injection through the ID.
- Records include IP addresses and usernames. Access to logs and the audit file should be limited to those who need it.

## Testing

### Automated

With the stack running (`docker compose up -d`):

```bash
cd backend
bash scripts/cy017-security-log-tests.sh
```

The script runs 18 checks. Each sends a request, checks the response, finds the matching record by `request_id` and checks its fields and that no secrets leaked. It ends with a summary table and saves evidence to `backend/logs/` (gitignored). See `backend/scripts/README.md` for details.

### Manual (Postman)

Base URL `http://localhost:3001`. Watch records while testing:

```bash
docker logs -f api-gateway 2>&1 | grep --line-buffered '^{' | jq .
docker logs -f user-service 2>&1 | grep --line-buffered '^{' | jq .
```

Adding a header such as `x-request-id: demo-test-01` makes the record easy to find with `grep`.

| Event | Reason | Postman steps | Expected response | Record (container) |
|---|---|---|---|---|
| `access_restricted` | `missing_authorization_header` | GET `/api/users/user`, Auth: No Auth | 401 "No token provided" | `details.cause` set (api-gateway) |
| `access_restricted` | `non_bearer_authorization_scheme` | Same request, Auth: Basic Auth | 401 "No token provided" | `details.cause` set (api-gateway) |
| `token_invalid` | `malformed` | Bearer Token `notatoken` | 401 "Invalid token" | severity medium (api-gateway) |
| `token_invalid` | `expired` | Reuse a token 15+ minutes after login, or an expired test token | 401 "Invalid token" | severity low (api-gateway) |
| `access_restricted` | `user_not_found` | Test token for a user that does not exist | 401 "Logged out" | `details.cause` set (api-gateway) |
| `request_id` | generated UUID | Any request without `x-request-id` | UUID in the `x-request-id` response header | Same UUID on the record (api-gateway) |
| `auth_failure` | `bad_password` | POST `/api/users/auth/login` with a real username and wrong password | 401 "Invalid username or password" | `user_id` and `role` set (user-service) |
| `auth_failure` | `unknown_user` | Same, with a username that does not exist | Same 401 as above | No `user_id` (user-service) |
| `token_issued` | `grant_type=password` | Log in with valid credentials | 200 with tokens | No token value in the record (api-gateway) |
| `rbac_denied` | `check=roles` | Analyst token → GET `/api/users/user` | 403 "Access denied" | `required_roles`, `actual_role` (api-gateway) |
| `rbac_denied` | `check=self_or_roles` | Analyst token → POST `/api/users/auth/logout/<another user id>` | 403 "You are not authorized to access this user account" | `requested_user_id` (api-gateway) |
| `token_invalid` | `bad_signature` | Add characters to the end of a valid token | 401 "Invalid token" | severity high (api-gateway) |
| `access_restricted` | `token_no_longer_matches_account` | Log in, log in again 2+ seconds later, use the first token | 401 "Logged out" | severity high (api-gateway) |
| `token_issued` | `grant_type=refresh_token` | POST `/api/users/auth/refresh`, body `{"refresh_token":"<from login>"}` | 200 with a new access token | (api-gateway) |
| `token_invalid` | `refresh_expired` | Refresh with an expired refresh test token | 401 "Invalid or expired refresh token" | No `request_id` yet (user-service) |
| `rate_limit_exceeded` | `rate_limit_hit` | Not testable until the limiter is attached. Then: 6 logins within 15 minutes | 429 "Too many login attempts…" | (api-gateway) |

Control: an admin token on GET `/api/users/user` returns 200 and produces no denial record.

Test tokens (expired, or for a user that does not exist) are created inside the container, where the secret is already set. See `backend/scripts/README.md`.

Audit file check: `docker exec api-gateway tail -3 logs/security.log` should show only JSON security records.

## Known Limitations

- `refresh_expired` records have no `request_id` or client IP, because the refresh call does not yet pass gRPC metadata.
- The audit file is lost when the container is rebuilt. A Docker volume would make it persistent.
- There is no retention policy or SIEM connection yet.
- Token checks on the notification WebSocket (`getAuthenticatedUserFromToken()`, added in #393) do not produce security records yet.
- If `SECURITY_LOG_PATH` points outside `logs/`, its folder must already exist.

## Contributors

Area 5, Security Monitoring and Audit Logging (CY017): Md Isa Sayek Huda (module, `rbac_denied`, `token_invalid`, correlation IDs, service attribution, Winston integration, audit file, tests), Jasmanpreet Singh (`access_restricted`, rate-limit logging, `token_invalid` with Isa), Branito (`token_issued`, `auth_failure`).
