import Redis from "ioredis";
import { logger } from "../config";

/**
 * Shared Redis client for all Phoenix backend services.
 *
 * Connection is lazy — ioredis connects on first command, not on
 * import — so requiring this module has no side effects until it's
 * actually used.
 */
export const redisClient = new Redis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
});

redisClient.on("connect", () => {
  logger.info("Redis: connection established");
});

redisClient.on("ready", () => {
  logger.info("Redis: ready to accept commands");
});

redisClient.on("error", (err) => {
  logger.error(`Redis: connection error - ${err.message}`);
});

redisClient.on("close", () => {
  logger.warn("Redis: connection closed");
});

redisClient.on("reconnecting", (delay: number) => {
  logger.warn(`Redis: reconnecting in ${delay}ms`);
});

/**
 * Reports whether Redis is currently reachable and responding.
 * Used by service health-check endpoints (e.g. GetUserHealth) so a
 * degraded Redis doesn't get discovered only when a cache call fails
 * mid-request.
 */
export const checkRedisHealth = async (): Promise<{
  healthy: boolean;
  status: string;
}> => {
  try {
    const response = await redisClient.ping();
    return { healthy: response === "PONG", status: redisClient.status };
  } catch (err) {
    logger.error(
      `Redis: health check failed - ${err instanceof Error ? err.message : String(err)}`,
    );
    return { healthy: false, status: redisClient.status };
  }
};

/**
 * Closes the Redis connection cleanly. Call this from each service's
 * shutdown handler (SIGTERM/SIGINT) alongside the existing DB/RabbitMQ
 * shutdown logic, so in-flight commands finish instead of being
 * dropped mid-connection.
 */
export const closeRedisConnection = async (): Promise<void> => {
  try {
    await redisClient.quit();
    logger.info("Redis: connection closed gracefully");
  } catch (err) {
    logger.error(
      `Redis: error during graceful shutdown - ${err instanceof Error ? err.message : String(err)}`,
    );
    redisClient.disconnect();
  }
};