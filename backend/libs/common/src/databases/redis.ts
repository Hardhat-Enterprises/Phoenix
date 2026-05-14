import Redis from "ioredis";
import { config } from "../config/config";
import { logger } from "../config/logger";

/**
 * Singleton Redis client.
 * In Docker: connects via REDIS_HOST/REDIS_PORT env vars (set to the redis service).
 * Locally: defaults to localhost:6379. l
 */
const redis = new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  lazyConnect: true,
});

redis.on("connect", () => {
  logger.info(`Redis connected at ${config.REDIS_HOST}:${config.REDIS_PORT}`);
});

redis.on("error", (err: Error) => {
  logger.error(`Redis connection error: ${err}`);
});

export default redis;