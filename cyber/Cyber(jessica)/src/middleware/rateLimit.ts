import { Request, Response } from "express";
import { sendSecurityNotification } from "../notifications/notificationService";
import rateLimit from "express-rate-limit";

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {

  sendSecurityNotification(
    "RATE_LIMIT_EXCEEDED",
    "MEDIUM",
    "Too many login attempts detected.",
    req.originalUrl,
    req.method,
    req.ip
  );

  res.status(429).json({
    status: 429,
    message: "Too many login attempts. Please try again later.",
    data: [],
  });
},
});

export const registerRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {

  sendSecurityNotification(
    "RATE_LIMIT_EXCEEDED",
    "MEDIUM",
    "Too many registration attempts detected.",
    req.originalUrl,
    req.method,
    req.ip
  );

  res.status(429).json({
    status: 429,
    message: "Too many registration attempts. Please try again later.",
    data: [],
  });
},
});

export const moderateReadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {

  sendSecurityNotification(
    "RATE_LIMIT_EXCEEDED",
    "MEDIUM",
    "Rate limit exceeded.",
    req.originalUrl,
    req.method,
    req.ip,
    req.user?.id
  );

  res.status(429).json({
    status: 429,
    message: "Too many requests.",
    data: [],
  });
},
});

export const ingestionRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {

  sendSecurityNotification(
    "RATE_LIMIT_EXCEEDED",
    "HIGH",
    "Too many ingestion requests detected.",
    req.originalUrl,
    req.method,
    req.ip,
    req.user?.id
  );

  res.status(429).json({
    status: 429,
    message: "Too many ingestion requests.",
    data: [],
  });
},
});