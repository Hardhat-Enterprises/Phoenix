import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";

const redisClient = new Redis(
  process.env.REDIS_URL || "redis://phoenix-redis:6379",
);

redisClient.on("error", (error) => {
  console.error("Redis rate limiter error:", error);
});

const redisStore = new RedisStore({
  sendCommand: async (command: string, ...args: string[]) => {
    return redisClient.call(command, ...args) as Promise<number>;
  },
});

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,

  standardHeaders: true,
  legacyHeaders: false,

  store: redisStore,

  message: {
    status: 429,
    error: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests. Please try again later.",
  },
});

// Stricter limiter for authentication endpoints
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,

  standardHeaders: true,
  legacyHeaders: false,

  store: redisStore,

  message: {
    status: 429,
    error: "RATE_LIMIT_EXCEEDED",
    message: "Too many login attempts. Please try again later.",
  },
});