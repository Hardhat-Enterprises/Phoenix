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
- `getEventStatuses` integrated with cache-aside pattern using
  `createCacheKey()`, with full test coverage (cache hit, cache miss,
  fail-soft fallback)

## What's still open

- Group sign-off on priority ranking and initial endpoint (this doc)
- Integration of caching into the first approved read operation
- Tests for Redis connection/disconnection, cache client startup, and the
  first cached endpoint (blocked on the above)
  ## Cache key, TTL, and invalidation design — getEventStatuses

**Key format:** `phoenix:{environment}:{service}:{resource}:{identifier}`,
built via the shared `createCacheKey()` utility
(`libs/common/src/cache/cache-key.ts`). Environment is read from
`process.env.NODE_ENV` internally rather than passed by the caller,
to avoid every call site needing to know/pass it correctly.

**getEventStatuses key:** `createCacheKey("user-service", "event-statuses", "all")`
→ e.g. `phoenix:development:user-service:event-statuses:all`

**TTL:** 3600s (1 hour). Event statuses are near-static reference data;
this bounds staleness without needing active invalidation.

**Invalidation:** None implemented. No create/update endpoint exists
for event statuses anywhere in the codebase, so TTL-only expiry is
sufficient. If a write endpoint is added later, it must call
`cacheService.delete(...)` using the same key on write.

**Known gap (out of scope for this PR):** `getUsers`/`registerUser`
in `user.service.ts` still use a separate, older caching mechanism
(`getCache`/`setCache`/`deleteCache` from `@phoenix/common/redis/cache`)
that predates this CacheService. Flagged to the team — needs migrating
to the shared `cacheService`/`createCacheKey()` pattern to avoid two
caching systems coexisting.

## TTL matrix

| Data category | Example resources | Recommended TTL | Reasoning |
|---|---|---|---|
| Static reference data | event-statuses, linked-event-types, seasons, reference-days, reference-times | 3600s (1 hour) | Rarely changes; no write endpoints currently exist for these tables |
| Semi-static data | locations, user roles/permissions | 300–900s (5–15 min) | Changes occasionally (admin edits); short TTL bounds staleness without needing invalidation wiring for every edit path |
| Frequently-changing data | dashboard stats, hazard/threat counts, activity feeds | 30–60s or no caching | Values change often; long TTLs risk showing stale operational data. Caching mainly helps under high read load, not correctness |
| User-specific / session data | user profile, auth tokens | Not cached via this layer | Session/auth already has its own token-based mechanism; caching here would risk serving stale permissions after a role change |

**Current implementation status:** only `event-statuses` (static reference data) is actually integrated so far. The other rows are the group's agreed target categorization for future endpoints, not yet implemented.

## Invalidation matrix

| Operation | Cache impact | Invalidation approach |
|---|---|---|
| Create | New record added to a cached collection | Delete the collection-level cache key (e.g. `event-statuses:all`) so the next read repopulates it with the new record included |
| Update | Existing record's data changes | Delete both the collection-level key and any resource-specific key (e.g. `users:{id}`) tied to that record |
| Delete | Record removed | Same as update — delete collection-level and resource-specific keys for the removed record |
| Related-key invalidation | A change in one resource affects a derived/aggregate cache (e.g. dashboard counts) | Delete the derived cache key(s) alongside the source resource's key, since aggregates can silently go stale otherwise |

**Current status:** no write endpoints exist yet for any of the currently-cached resources (event statuses), so no invalidation calls have been needed in practice. The matrix above is the group's agreed policy for when write endpoints for cached resources are added later.

## Serialization

`CacheService` handles JSON serialization/deserialization internally (`JSON.stringify` on set, `JSON.parse` on get) — callers pass and receive plain JS objects/arrays, never raw strings. No separate serialization helpers are needed at the call-site level.

**Malformed cache value handling:** if a cached value fails to parse (corrupted data, manual Redis tampering, a schema change that breaks an old cached shape), `CacheService.get()` fails soft — it logs the error and returns `null`, which the calling code already treats identically to a cache miss. This means a corrupted cache entry self-heals on the next read: the miss triggers a fresh DB fetch and overwrites the bad entry.

## Stale-data risk analysis

- **Static reference data** (event statuses, seasons, etc.): low risk. These tables have no write endpoints currently, so the only staleness source is a TTL expiry window (max 1 hour) — acceptable for data that changes rarely if ever.
- **Semi-static data** (locations, roles): moderate risk if a short TTL isn't respected consistently. An admin edit won't be reflected until the TTL expires, since no invalidation is wired up yet for these resources' write paths — worth revisiting once those endpoints are cached.
- **Aggregate/dashboard data**: highest risk if cached at all, since these are meant to reflect near-real-time counts. Recommend either not caching these or using very short TTLs (30–60s) rather than relying on invalidation, since so many underlying tables can affect one aggregate.
- **General mitigation:** the invalidation helpers (`invalidateCache`, `invalidateRelatedCache`) exist and are tested, ready to be called from write endpoints once those are built for currently-cached resources.