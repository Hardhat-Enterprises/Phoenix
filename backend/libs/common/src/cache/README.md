# Redis Caching Strategy — Analysis (Member 5)

**Task**: S2-T3 — Redis Caching Strategy
**Role**: Member 5 — Caching Task Leader
**Author**: Titiksha Rathod
**Status**: Foundation implemented and PR'd (#289). Awaiting group sign-off on candidate priority and initial endpoint before Phase 3 integration.

## 1. Current Redis usage

No Phoenix service used Redis before this task. A client was initialised in
`libs/common/src/redis/redis.ts` but had zero call sites anywhere in the
codebase. All four backend services already have `REDIS_URL` wired in
`docker-compose.yaml` with a `redis:7` container and health check, so the
infrastructure was ready but unused.

## 2. Cache-candidate list and priority ranking

| Priority | Endpoint | Service | Why |
|---|---|---|---|
| 1 (highest) | `getEventStatuses`, `getLinkedEventTypes`, `getSeasons` | user-service | Tiny static lookup tables, parameterless reads, near-zero invalidation risk, likely hit on most filter/dropdown loads |
| 2 | `getLocations` | user-service | Larger reference dataset, still static, meaningful DB-load reduction |
| 3 | `getReferenceDays`, `getReferenceTimes` | user-service | Potentially large (up to 365 rows / many time slots) — biggest payoff, still static reference data |

Ranked by invalidation risk × table size — smallest, most static tables first
to validate the pattern before expanding to larger datasets.

## 3. Data that should NOT be cached

- `getUserDashboard*` endpoints — per-user, time-sensitive, personalized.
  Would need per-user keys and much shorter TTLs; different risk profile,
  out of scope for this phase.
- Auth flow (`register`/`login`/`refresh`/`logout`) — caching auth responses
  is a security anti-pattern (stale permissions, session confusion). JWTs
  are already stateless.

## 4. Recommended caching pattern

**Cache-aside** (lazy loading): check cache → on miss, read DB → populate
cache → return. Chosen because all current candidates are pure reference
reads with no meaningful write path to hook a write-through strategy into.

## 5. Proposed Redis client interface

Implemented per the task doc's example (`CacheService`: get/set/delete/
deleteMany/exists), see `cache.service.ts`. One addition beyond the spec:
every method fails soft — logs and returns a safe default instead of
throwing — so a Redis outage degrades to "always hits the DB" rather than
crashing the API.

## 6. Redis connection lifecycle

`connect` → `ready` → command execution → on failure: `error` (logged) +
automatic `reconnecting` (backoff: `min(attempt × 50ms, 2000ms)`) → on
shutdown: `closeRedisConnection()` calls `quit()`, falling back to
`disconnect()` if that fails.

**Known trade-off**: `maxRetriesPerRequest: null` means ioredis retries a
command indefinitely rather than failing after N attempts. Acceptable for
short outages; if Redis is down for an extended period, commands queue
rather than failing fast. Flagging this for group awareness, not asserting
it's the final answer.

## 7. Redis configuration requirements

- `REDIS_URL` — required, format `redis://<host>:<port>`. Already set
  per-service in `docker-compose.yaml`.
- **Gap found**: `REDIS_URL` is missing from the root `.env.example` —
  anyone setting up locally outside Docker has no reference for it.
- Retry/backoff: handled by ioredis's built-in `retryStrategy`, no separate
  connection timeout currently configured.
- Health check: `redis:7` image with `redis-cli ping` in `docker-compose.yaml`;
  `checkRedisHealth()` mirrors this for runtime checks.

## 8. Initial endpoint selected for implementation

**Proposed: `getEventStatuses`** — smallest, lowest-risk candidate, cleanest
end-to-end validation of the cache-aside pattern before rolling out to the
other five. **Needs group sign-off** per the task doc (Phase 1 requires
group agreement on cache candidates before implementation proceeds).

## What's implemented (PR #289)

- Shared Redis client with connection/error/reconnect logging
- `checkRedisHealth()` and `closeRedisConnection()` (graceful shutdown)
- `CacheService` (get/set/delete/deleteMany/exists), cache-aside, fail-soft
- Jest test infrastructure (shared `jest.config.js`, path-alias resolution)
- 12 unit tests: cache hit, miss, malformed-JSON eviction, Redis-down handling

## What's still open

- Group sign-off on priority ranking and initial endpoint (this doc)
- Integration of caching into the first approved read operation
- Tests for Redis connection/disconnection, cache client startup, and the
  first cached endpoint (blocked on the above)