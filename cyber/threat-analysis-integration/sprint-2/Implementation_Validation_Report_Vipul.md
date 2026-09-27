# Threat Analysis Integration – Sprint 2 Implementation Validation Report

| | |
|---|---|
| Author | Vipul (Cybersecurity – Threat Analysis Integration sub-team) |
| Sub-team | Mannat (lead), Dilano Xavier, Vipul |
| Sprint 2 task | Validate the actual implementation against the Sprint 1 API Data Exchange Specification, Risk Score & Threat Classification Mapping and Security Validation Checklist |
| Code baseline | `dev` branch, commit `3cc6d8a` (26 Sep 2026) |
| Method | Static review of the source code, plus an automated route test for SVC-03 (no live penetration testing) |
| Date | 27 Sep 2026 |

## 1. Purpose

In Sprint 1 I wrote three design documents for the Threat Analysis Integration (listed in Section 7). In the Sprint 2 plan, Mannat asked me to check whether the real Phoenix implementation matches what those documents define.

This report records that check. For every requirement it shows what the code actually does, where the evidence is (file and line), whether it passes, and what should change. It also lists the places where my own Sprint 1 documents were wrong, so they can be corrected before anyone builds or tests against them.

## 2. Scope and method

Code reviewed on `dev` at `3cc6d8a`:

- `backend/api-gateway` (routes, middleware, controllers)
- `backend/user-service` (registration and roles)
- `backend/data-ingestion-service` (cyber/hazard ingestion, notification publishing)
- `backend/notification-service`
- `backend/libs/common` (roles, Redis, core model integration)

For each item I searched the code for the relevant control, read the implementation, and recorded one of these results:

- **Pass** – implemented as specified
- **Partial** – implemented in some places or in a weaker form
- **Fail** – implemented differently in a way that breaks the requirement
- **Not implemented** – no implementation found on `dev`

Limitations: apart from the automated SVC-03 test, this is a code review, not a runtime test of the deployed system. Deployment settings that are not in the repository (for example TLS at a load balancer) could not be checked. Work on unmerged branches is mentioned but not counted as implemented.

## 3. Summary

| Result | Count | Items |
|---|---|---|
| Pass | 1 | SVC-02 |
| Partial | 3 | SVC-06, SVC-08, SVC-09 |
| Fail | 2 | SVC-03, SVC-04 |
| Not implemented | 3 | SVC-01, SVC-05, SVC-07 |

Most important findings:

1. **RBAC role name mismatch blocks the ingestion endpoints (SVC-03).** The routes require the role `"ingestion service"` (with a space), but the only role that can be registered is `"ingestion_service"` (with an underscore). No account can pass that check, so `POST /api/ingestion/hazard` and `POST /api/ingestion/cyber` return 403 for every caller.
2. **No request validation on ingestion, plus mass assignment (SVC-04).** Request bodies go straight to RabbitMQ and then into `CyberThreat.create({...parsedContent})`, so the sender controls every database column.
3. **No rate limiting on `dev` (SVC-05)** and **no payload integrity/HMAC (SVC-07)**. Both exist only on unmerged branches.
4. **Risk scale in my mapping document is wrong.** The real core model returns a 0–1 risk score with Critical at ≥ 0.75. My document used 0–100 with Critical at ≥ 85. For example, a score of 0.80 is *Critical* in the code but would be *High* under my document.

## 4. Security Validation Checklist results

### SVC-01 Transport security (TLS 1.3 / HTTPS) – Not implemented

- **Requirement:** enforce TLS 1.3/HTTPS on all endpoints and reject plain HTTP.
- **Found:** the API gateway starts a plain HTTP server (`api-gateway/src/app.ts` lines 4 and 31, `createServer` from `"http"`). There is no HTTPS, HSTS or security-header middleware, and no reverse-proxy or TLS configuration in the repository.
- **Recommendation:** terminate TLS at a reverse proxy or cloud load balancer, add HSTS and security headers (for example `helmet`), and document where TLS is enforced. TLS 1.3 is a deployment decision, so the spec should say "HTTPS required; TLS 1.2+ (1.3 preferred) at the edge".

### SVC-02 Authentication (JWT) – Pass

- **Requirement:** a valid JWT Bearer token on every protected request, 401 when missing or invalid.
- **Found:** `authenticate` (`api-gateway/src/middleware/auth.middleware.ts`) rejects requests without `Bearer ` (line 39), verifies the signature, and checks the token matches the one stored for the user (line 26), so logged-out tokens are rejected. It is applied to every data route in the user, threat, ingestion, storage and notification routers. The only unauthenticated routes are the health checks, `/auth/login` and `/auth/refresh`, which is expected.
- **Note:** my own unmerged branch `feature/response-decision-manager` adds `POST /api/notifications/from-threat-analysis` without `authenticate`. I am fixing this in a separate PR.

### SVC-03 Access control (RBAC) – Fail

- **Requirement:** least-privilege roles, 403 on unauthorised actions.
- **Found:**
  1. **Role name mismatch.** `api-gateway/src/routes/ingestion.routes.ts` lines 153 and 260 use `authorize(["ingestion service"])`. The role enum (`libs/common/src/constant/user-role.ts` line 5) defines `ingestion_service`, and registration rejects any role not in the enum (`user-service/src/services/user.service.ts` line 360). No user can hold `"ingestion service"`, so the hazard and cyber ingestion endpoints return 403 to everyone. The controls fail closed, which is safe, but the endpoints are unusable.
  2. **`POST /api/ingestion/core` checks authentication only** (`ingestion.routes.ts` line 355). Any logged-in user, including `end_user`, can trigger the core model. Arshdeep also found this; his fix on the unmerged branch `security/core-ingestion-rbac` uses `authorize([UserRole.INGESTION_SERVICE])`, which is the correct approach and should be applied to the hazard and cyber routes as well.
  3. **Default role not in the enum.** New users without a role get `"user"` (`user.service.ts` line 383), which is not a valid `UserRole` (`admin`, `analyst`, `end_user`, `ingestion_service`).
  4. The `analyst` role is defined but never used in any `authorize()` check. Most read routes only require authentication.
- **Recommendation:** use `UserRole.INGESTION_SERVICE` instead of string literals, add `authorize` to `/api/ingestion/core`, change the default role to `UserRole.END_USER`, and decide which routes need `analyst`/`admin`.
- **Confirmed by test and fixed (finding 1):** I wrote `api-gateway/src/routes/ingestion.routes.test.ts`, which starts the ingestion router with the real `authenticate`/`authorize` middleware and sends requests with different roles. On unmodified `dev` the test fails: a valid `ingestion_service` token receives **403** on both routes. After changing the two routes to `authorize([UserRole.INGESTION_SERVICE])`, all 10 tests pass (401 without a token, 403 for `end_user`/`analyst`, 202 for `ingestion_service`). Fix submitted in [PR #417](https://github.com/Hardhat-Enterprises/Phoenix/pull/417) (branch `vipul/fix-ingestion-rbac-role`). `/api/ingestion/core` is left to Arshdeep's branch so our changes do not overlap.

### SVC-04 Input validation – Fail

- **Requirement:** validate JSON schema and field types, reject malformed input with 400.
- **Found:**
  - `ingestHazardData` and `ingestCyberData` (`api-gateway/src/controllers/ingestion.controller.ts` lines 38 and 67) forward `req.body` to RabbitMQ with no validation and return 202 regardless.
  - The consumer only checks the payload is not empty (`data-ingestion-service/src/services/ingestion.service.ts` line 112), then saves it with `CyberThreat.create({...parsedContent})` (line 133). This is a **mass-assignment** risk (OWASP API Top 10 2023, API3): the sender controls every column written to the database.
  - Zod schemas already exist in `cyber/Cyber(jessica)/src/schemas/ingestionSchemas.ts` but are not used by the backend.
  - The notification routes do validate pagination and filters (`notification.validation.middleware.ts`), which is good.
- **Recommendation:** validate request bodies at the gateway (reuse the Zod schemas), return 400 on failure, and copy only allowed fields into `CyberThreat.create`.

### SVC-05 Rate limiting – Not implemented

- **Requirement:** limit requests per client/token, return 429 when exceeded.
- **Found:** no rate limiting on `dev`. The event type `RATE_LIMIT_EXCEEDED` is defined (`api-gateway/src/notifications/notificationTypes.ts` line 6) but never used. Rate limiting exists on four unmerged branches: `security/login-rate-limiting`, `feature/rate-limit-redis-store`, `feature/rate-limit-integration-digraj` and `sprint-2-rate-limiting`.
- **Recommendation:** agree on one implementation, preferably the Redis-backed one so limits work across instances, and merge it. Start with `/auth/login` and the ingestion routes.

### SVC-06 Secure error handling – Partial

- **Requirement:** no stack traces or internal details in error responses.
- **Found:** most gateway controllers return fixed messages (for example "Error ingesting cyber data"). However:
  - `storage.controller.ts` line 47 returns `error.message` to the client.
  - The notification gRPC handler builds failure messages from the raw exception (`notification-service/src/grpc/notification.handler.ts` line 40, `${error}`), and the gateway passes `response.message` back to the client, so internal error text can reach users.
- **Recommendation:** log the full error server-side and return a generic message with a correlation ID.

### SVC-07 Data integrity and hashing – Not implemented

- **Requirement:** verify hashes/signatures on high-severity payloads.
- **Found:** there is no `createHmac`, `createHash` or signature check anywhere in `backend` on `dev`. HMAC signing of TEAVS alerts exists only in Izaan's TEAVS–ADCRS integration work, which is not merged.
- **Recommendation:** merge the TEAVS–ADCRS signing work and verify the signature before any alert is stored or broadcast.

### SVC-08 Audit logging and traceability – Partial

- **Requirement:** log security events and decisions with timestamps and correlation IDs.
- **Found:**
  - The auth middleware raises security events (`UNAUTHORIZED_ACCESS`, `INVALID_JWT`, forbidden access), added by Jessica in PR #343.
  - These are written with `console.log` only (`notificationLogger.ts` line 6). They are not stored, have no correlation ID and can be lost when a container restarts.
  - Ingestion is traceable through the `DataIngestionStreamingLog` table, which records status and failure reasons.
- **Recommendation:** send security events to the shared logger and store them (database or log service), with a request/correlation ID.

### SVC-09 Service isolation and resilience – Partial

- **Requirement:** graceful degradation when a dependency is slow or down.
- **Found:**
  - Redis is optional and has a 1-second timeout; the gateway keeps running without cache (`app.ts` line 70, `libs/common/src/redis/cache.ts` line 5).
  - A failed notification publish does not fail ingestion (`ingestion.service.ts` line 146).
  - RabbitMQ is a hard dependency: the gateway exits if it cannot connect (`app.ts` line 81).
  - I could not find a timeout around the core model call, so I could not verify ADCRS time-out handling.
- **Recommendation:** add reconnect/backoff for RabbitMQ and a timeout plus fallback for the model call.

### Additional finding – CORS allows any origin

`app.use(cors())` (`app.ts` line 35) accepts requests from any origin. This is not in my checklist, but it affects the same interfaces; it was also reported in the cyber stream's Week 5 report (`cyber/Phoenix_Week5_Report.docx`). **Recommendation:** restrict CORS to the known frontend origins.

## 5. API Data Exchange Specification vs implementation

My specification described versioned endpoints under `/api/v1/...`. None of these exist. The real integration uses the following routes:

| My spec (Sprint 1) | Real implementation on `dev` | Result |
|---|---|---|
| `POST /api/v1/events/ingest` (v3) / `POST /api/v1/threats/ingest` (v1) | `POST /api/ingestion/cyber` and `POST /api/ingestion/hazard` | Different path; returns 202 as my spec said |
| `POST /api/v1/adcrs/evaluate` (v3) / `POST /api/v1/internal/adcrs/score` (v1) | `POST /api/ingestion/core` (core model via RabbitMQ) | Different path; authentication only (see SVC-03) |
| `POST /api/v1/threats/results` | No endpoint. Results reach users through RabbitMQ → notification-service → WebSocket | Different design (event-driven) |
| `GET /api/v1/dashboard/threats` / `GET /api/v1/threats/{event_id}` | `GET /api/users/threats`, `GET /api/users/threats/:threatId`, `GET /api/users/dashboard/*` | Different path |
| Roles `EventProducer`, `ThreatAnalyst`, `SecurityAdmin` (v3) / `authority_admin`, `analyst`, `ingest_service` (v1) | `admin`, `analyst`, `end_user`, `ingestion_service` | Different names |
| Header `X-PHOENIX-Signature` (HMAC) | Not implemented (SVC-07) | Missing |
| Event fields `event_id`, `event_type`, `timestamp`, `source`, `event_data` | Gateway docs use `event_id`, `timestamp`, `event_type`, `source`, `location`, `payload`; the consumer type `CyberDataStreamRequest` uses `threat_type`, `severity`, `confidence_score`, `details` | Three different shapes |

The spec was written from the design documents before I had checked the code, so it describes the intended design rather than the system that exists. The last row also shows that the gateway documentation and the consumer disagree with each other, which needs to be fixed regardless of my spec.

## 6. Risk Score & Threat Classification Mapping vs implementation

The implemented core model (`backend/libs/common/src/helper/core_model_integration.py`, `_risk_level`, lines 265–272) returns `risk_score` between 0 and 1, a `confidence_score` between 0 and 1, and these levels:

| Level | Real code (0–1) | My mapping v3 (0–100) | My mapping v1 (0–100) |
|---|---|---|---|
| Low | < 0.25 | 0–29 | 0–39 |
| Medium | 0.25–0.49 | 30–59 | 40–69 |
| High | 0.50–0.74 | 60–84 | 70–89 |
| Critical | ≥ 0.75 | 85–100 | 90–100 |

Other differences:

- **Rule engine uses "Normal", not "Low".** `cyber/cyber/detection-response/detection_rules.py` returns `Normal`, `Medium`, `High` or `Critical`.
- **The rule engine is not connected to the backend.** Nothing in `backend` calls `detection_rules.py`.
- **Notifications ignore the risk score.** A cyber notification is sent only when the incoming `severity` equals `"critical"` (`data-ingestion-service/src/rabitmq/notification-publisher.ts` line 32). The combination of rule severity and ADCRS score described in the design (the Response Decision Manager step) is not implemented on `dev`.
- **Confidence fallback.** When the model has no probabilities, confidence is fixed at 0.70 (`core_model_integration.py` line 291). Under my confidence rule (≥ 0.75 needed for automatic action on High risk) such results would always go to analyst review.

**Recommendation:** use the code's 0–1 bands as the single source of truth and update the mapping document to match. My Response Decision Manager work (separate PR) implements the missing combination step using these real bands.

## 7. Corrections to my own Sprint 1 documents

| Document | What was wrong | Correction |
|---|---|---|
| API Data Exchange Specification (v1 PDF and v3 DOCX) | Endpoint paths, role names and HMAC header do not exist in the code; v1 and v3 also disagree with each other; the v1 PDF contains unrendered formatting (e.g. `$\leftrightarrow$`, `$\ge 0.50$`) | Treat Section 5 of this report as the correction; update paths and roles to the real ones |
| Risk Score & Threat Classification Mapping | 0–100 scale; two different band sets (v1 and v3); Section 5 thresholds (75/40) do not match its own table | Use the 0–1 bands in Section 6 |
| Security Validation Checklist | Every item marked "Verified / Designed", although nothing had been checked against the code | Replace the status column with the results in Section 4 |

## 8. Recommendations (priority order)

| # | Recommendation | Relates to | Suggested owner |
|---|---|---|---|
| 1 | Fix the `"ingestion service"` role string (use `UserRole.INGESTION_SERVICE`) and add `authorize` to `/api/ingestion/core` | SVC-03 | Vipul – hazard/cyber fixed with tests (PR #417); Arshdeep – `/core` |
| 2 | Validate ingestion request bodies (reuse the Zod schemas) and remove the mass assignment | SVC-04 | Cyber + Backend |
| 3 | Merge one rate-limiting implementation | SVC-05 | Cyber |
| 4 | Merge TEAVS–ADCRS signing and verify signatures | SVC-07 | Cyber (TEAVS–ADCRS) |
| 5 | Persist security events with correlation IDs | SVC-08 | Cyber |
| 6 | Restrict CORS and stop returning raw error text | SVC-06, CORS | Backend |
| 7 | Agree on one event schema and one risk scale (0–1) across gateway, ingestion and AI/ML | Sections 5–6 | Threat Analysis Integration |
| 8 | Add the Response Decision Manager combination step, with authentication and tests | Section 6 | Vipul (PR in progress) |

## 9. How to reproduce these checks

From the repository root on `dev`:

```bash
# Role string used by routes vs role enum
grep -n 'ingestion service' backend/api-gateway/src/routes/ingestion.routes.ts
grep -n 'INGESTION_SERVICE' backend/libs/common/src/constant/user-role.ts

# Routes and the middleware in front of them
grep -n -E 'router\.(get|post|patch|delete)' backend/api-gateway/src/routes/*.ts

# Rate limiting, HMAC, TLS
grep -rn -i -E 'rate-?limit|createHmac|createHash|https' backend --include=*.ts

# Mass assignment in cyber ingestion
grep -n 'CyberThreat.create' backend/data-ingestion-service/src/services/ingestion.service.ts

# Real risk bands
grep -n -A8 'def _risk_level' backend/libs/common/src/helper/core_model_integration.py
```

Automated check for SVC-03 (from `backend/`, after `npm install`):

```bash
npx jest api-gateway/src/routes/ingestion.routes.test.ts
```

Suggested runtime checks for Dilano's Integration Testing Plan (SIT-02, SIT-03, SIT-05): call `/api/ingestion/cyber` with no token (expect 401), with an `end_user` token (expect 403), with an `ingestion_service` token (currently 403 because of finding SVC-03), and send 200 requests in a minute (currently no 429).
