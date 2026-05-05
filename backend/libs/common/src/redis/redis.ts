import Redis from "ioredis";
import { logger } from "@phoenix/common";

const redis = new Redis(process.env.REDIS_URL!, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on("connect", () => {
  logger.info("Redis connected");
});

redis.on("error", (err) => {
  logger.error("Redis error:", err);
});

export default redis;