import rateLimit from "express-rate-limit";
import { fromRequest, logRateLimitExceeded } from "@phoenix/common";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    logRateLimitExceeded({
      ...fromRequest(req),
      reason: "rate_limit_hit",
      response_code: 429,
      outcome: "blocked",
    });

    res.status(429).json({
      status: 429,
      message: "Too many login attempts. Please try again later.",
    });
  },

  message: {
    status: 429,
    message: "Too many login attempts. Please try again later.",
  },
});