import { sendSecurityNotification } from "../notifications/notificationService";
import  { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {

  sendSecurityNotification(
    "VALIDATION_FAILED",
    "LOW",
    "Request validation failed.",
    req.originalUrl,
    req.method,
    req.ip,
    req.user?.id
  );

  res.status(400).json({
    status: 400,
    message: "Invalid request data",
    data: result.error.flatten(),
  });

  return;
}

    req.body = result.data;
    next();
  };
}