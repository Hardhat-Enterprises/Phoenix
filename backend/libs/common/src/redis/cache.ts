// src/lib/cache.ts
import redis from "./redis";

export const withCache = async <T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> => {
  const cached = await redis.get(key);

  if (cached) {
    return JSON.parse(cached);
  }

  const result = await fn();

  await redis.setex(key, ttl, JSON.stringify(result));

  return result;
};