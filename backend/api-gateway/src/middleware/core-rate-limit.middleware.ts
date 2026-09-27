import { Request, Response, NextFunction } from "express";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

const requests = new Map<string, { count: number; resetAt: number }>();

export const coreRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const key = req.ip || "unknown";
  const now = Date.now();

  const existing = requests.get(key);

  if (!existing || now > existing.resetAt) {
    requests.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });

    return next();
  }

  existing.count += 1;

  if (existing.count > MAX_REQUESTS) {
    return res.status(429).json({
      status: 429,
      message: "Rate limit exceeded",
    });
  }

  next();
};
