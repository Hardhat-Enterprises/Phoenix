import { redisClient } from "../redis";
import { logger } from "../config";

/**
 * Shared cache-aside interface used across all Phoenix services.
 *
 * Every service imports this instead of touching `redisClient`
 * directly, so cache key handling, serialization, and error behaviour
 * stay consistent no matter which service is calling it.
 *
 * Design decisions (Phase 1 agreement, S2-T3):
 *  - Serialization: JSON.stringify/parse. Simple, human-readable in
 *    redis-cli during debugging, and covers every value shape Phoenix
 *    currently caches (arrays of DB rows, plain objects).
 *  - Failure behaviour: a cache read/write error is logged and
 *    swallowed, never thrown. Redis is a performance layer, not a
 *    source of truth — a cache outage must not take the API down.
 *    Callers always get `null` on a failed/missing read and can fall
 *    back to the database.
 */
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
  exists(key: string): Promise<boolean>;
}

class RedisCacheService implements CacheService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await redisClient.get(key);
      if (raw === null) {
        return null;
      }

      try {
        return JSON.parse(raw) as T;
      } catch (parseErr) {
        // Malformed cached value (e.g. corrupted write, format change
        // between deployments) — treat as a miss rather than crash
        // the caller, and clear it so it doesn't poison future reads.
        logger.error(
          `Cache: failed to parse cached value for key "${key}", evicting - ${
            parseErr instanceof Error ? parseErr.message : String(parseErr)
          }`,
        );
        await redisClient.del(key);
        return null;
      }
    } catch (err) {
      logger.error(
        `Cache: get failed for key "${key}" - ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await redisClient.set(key, serialized, "EX", ttlSeconds);
    } catch (err) {
      logger.error(
        `Cache: set failed for key "${key}" - ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (err) {
      logger.error(
        `Cache: delete failed for key "${key}" - ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    try {
      await redisClient.del(...keys);
    } catch (err) {
      logger.error(
        `Cache: deleteMany failed for ${keys.length} key(s) - ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (err) {
      logger.error(
        `Cache: exists check failed for key "${key}" - ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return false;
    }
  }
}

export const cacheService: CacheService = new RedisCacheService();