import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("Internal server error:", err.message);

  res.status(500).json({
    status: 500,
    message: "Internal server error",
    data: [],
  });
}