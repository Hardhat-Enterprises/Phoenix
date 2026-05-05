import { Request, Response, NextFunction } from "express";
import redis from "./redis";

type CacheOptions = {
  ttl?: number; // seconds
  keyPrefix?: string;
};

export const cache =
  ({ ttl = 60, keyPrefix = "cache" }: CacheOptions = {}) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `${keyPrefix}:${req.originalUrl}`;

      const cachedData = await redis.get(key);

      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // override res.json to store response
      const originalJson = res.json.bind(res);

      res.json = (body: any) => {
        redis.setex(key, ttl, JSON.stringify(body));
        return originalJson(body);
      };

      next();
    } catch (err) {
      next(); // fail open if cache fails
    }
  };