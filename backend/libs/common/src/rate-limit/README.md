# Redis Rate-Limiting Store

## Algorithm comparison

### Fixed window

A fixed-window counter records the number of requests made during a defined time period. It has constant-time operations, low memory usage and is straightforward to implement atomically in Redis. Its limitation is that clients may create a short burst near the boundary between two windows.

### Sliding window

A sliding-window algorithm provides more accurate enforcement because it considers requests made during the immediately preceding period. However, it normally requires additional Redis operations or sorted-set entries, resulting in greater memory usage and implementation complexity.

### Token bucket

A token-bucket algorithm supports controlled bursts while maintaining a long-term request rate. It is suitable for more advanced traffic policies but requires additional state and refill calculations.

## Recommendation

The fixed-window algorithm is recommended for the initial Phoenix implementation because it is simple, efficient and appropriate for protecting distributed API services. The implementation can later be replaced with a sliding-window or token-bucket strategy if more precise traffic control is required.

## Redis key structure

Keys use the following structure:

`phoenix:ratelimit:{environment}:{policy}:{clientIdentifier}`

Each component is encoded before being added to the key. Separating the environment and policy prevents counters from different deployments or rate-limit policies from interfering with each other.

## Atomic counter operation

The store uses a Redis Lua script to execute the increment, expiration check and expiration assignment as one atomic operation. This prevents race conditions when multiple Phoenix instances process requests for the same client concurrently.

## Returned values

The `consume()` method returns:

- `allowed`: whether the request is within the configured limit.
- `limit`: maximum requests allowed in the window.
- `remaining`: requests remaining in the current window.
- `resetAt`: Unix timestamp indicating when the counter resets.
- `retryAfterSeconds`: number of seconds a blocked client should wait.

## Distributed consistency

All backend instances use the shared Redis counter rather than local memory. Redis executes the Lua script atomically, ensuring that simultaneous requests cannot overwrite each other's counter updates.

## Testing

The tests use an injected in-memory Redis-compatible client and do not require Docker or a live Redis server. They cover key generation, remaining-request calculations, invalid configuration and 20 concurrent requests against a limit of 10.