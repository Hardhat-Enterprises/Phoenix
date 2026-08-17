import Redis from "ioredis";

export const redisClient = new Redis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
});
