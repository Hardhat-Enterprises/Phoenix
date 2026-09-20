import { redisClient } from "./redisClient";
import { cacheMetrics } from "./cacheMetrics";
import { logger } from "../config/logger";

const REDIS_TIMEOUT = 1000;

class RedisTimeoutError extends Error {
    constructor() {
        super("Redis timeout");
        this.name = "RedisTimeoutError";
    }
}

async function withTimeout<T>(
    promise: Promise<T>
): Promise<T> {
    let timeout: NodeJS.Timeout;

    const timeoutPromise = new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
            reject(new RedisTimeoutError());
        }, REDIS_TIMEOUT);
    });

    try {
        return await Promise.race([
            promise,
            timeoutPromise,
        ]);
    } finally {
        clearTimeout(timeout!);
    }
}

export async function getCache<T>(
    key: string
): Promise<T | null> {

    if (!redisClient.isReady) {
        logger.warn(`CACHE UNAVAILABLE ${key}`);

        return null;
    }

    try {
        const value = await withTimeout(
            redisClient.get(key)
        );

        if (!value) {
            cacheMetrics.incrementMiss();

            logger.info(`CACHE MISS ${key}`);

            return null;
        }

        cacheMetrics.incrementHit();

        logger.info(`CACHE HIT ${key}`);

        return JSON.parse(value) as T;

    } catch (error) {

        if (error instanceof RedisTimeoutError) {
            cacheMetrics.incrementTimeout();

            logger.error(
                `CACHE TIMEOUT ${key}`,
                {
                    error: error.message
                }
            );
        } else {
            cacheMetrics.incrementError();

            logger.error(
                `CACHE ERROR ${key}`,
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : String(error)
                }
            );
        }

        return null;
    }
}

export async function setCache(
  key: string,
  value: unknown,
  ttl: number = 300,
): Promise<boolean> {
  if (!redisClient.isReady) {
    logger.warn(`CACHE SET UNAVAILABLE ${key}`);
    return false;
  }

  try {
  await withTimeout(
    redisClient.setEx(
      key,
      ttl,
      JSON.stringify(value),
    ),
  );

  logger.info(`CACHE SET ${key}`);

  return true;
  } catch (error) {
    if (error instanceof RedisTimeoutError) {
      cacheMetrics.incrementTimeout();

      logger.error(`CACHE SET TIMEOUT ${key}`, {
        error: error.message,
      });
    } else {
      cacheMetrics.incrementError();

      logger.error(`CACHE SET ERROR ${key}`, {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  return false;
  }
}

export async function deleteCache(
  key: string,
): Promise<boolean> {
  if (!redisClient.isReady) {
    logger.warn(`CACHE DELETE UNAVAILABLE ${key}`);
    return false;
  }

  try {
    await withTimeout(
      redisClient.del(key),
    );

    logger.info(`CACHE DELETE ${key}`);

    return true;
  } catch (error) {
    if (error instanceof RedisTimeoutError) {
      cacheMetrics.incrementTimeout();

      logger.error(`CACHE DELETE TIMEOUT ${key}`, {
        error: error.message,
      });
    } else {
      cacheMetrics.incrementError();

      logger.error(`CACHE DELETE ERROR ${key}`, {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }

    return false;
  }
}