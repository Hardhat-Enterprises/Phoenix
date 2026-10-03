import type {
  RateLimitResult,
  RateLimitStore,
} from "./rate-limit.types";

export interface RedisEvalClient {
  eval(
    script: string,
    numberOfKeys: number,
    ...args: string[]
  ): Promise<unknown>;
}

const FIXED_WINDOW_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
local ttl = redis.call("TTL", KEYS[1])

if current == 1 or ttl < 0 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end

return { current, ttl }
`;

const validatePositiveInteger = (
  value: number,
  fieldName: string,
): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
};

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redisClient: RedisEvalClient) {}

  async consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    if (!key.trim()) {
      throw new Error("key must not be empty");
    }

    validatePositiveInteger(limit, "limit");
    validatePositiveInteger(windowSeconds, "windowSeconds");

    const result = (await this.redisClient.eval(
      FIXED_WINDOW_SCRIPT,
      1,
      key,
      windowSeconds.toString(),
    )) as [number, number];

    const [currentCount, ttl] = result;
    const safeTtl = Math.max(ttl, 1);
    const allowed = currentCount <= limit;

    return {
      allowed,
      limit,
      remaining: Math.max(limit - currentCount, 0),
      resetAt: Math.floor(Date.now() / 1000) + safeTtl,
      retryAfterSeconds: allowed ? 0 : safeTtl,
    };
  }
}