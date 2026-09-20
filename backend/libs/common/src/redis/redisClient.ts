import dotenv from "dotenv";

dotenv.config({
  path: "../.env",
});

import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL,

  socket: {
    connectTimeout: 3000,

    reconnectStrategy: (retries, cause) => {
      console.error(
        `Redis reconnect attempt ${retries}:`,
        cause.message,
      );

      return Math.min(retries * 200, 2000);
    },
  },

  disableOfflineQueue: true,
});

redisClient.on("connect", () => {
  console.log("Redis connecting...");
});

redisClient.on("ready", () => {
  console.log("Redis ready");
});

redisClient.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});

redisClient.on("end", () => {
  console.log("Redis connection closed");
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err.message);
});

export async function connectRedis(): Promise<boolean> {
  if (redisClient.isReady) {
    return true;
  }

  if (redisClient.isOpen) {
    return false;
  }

  try {
    await redisClient.connect();

    return redisClient.isReady;
  } catch (error) {
    console.error(
      "Redis startup connection failed:",
      error instanceof Error
        ? error.message
        : String(error),
    );

    return false;
  }
}
