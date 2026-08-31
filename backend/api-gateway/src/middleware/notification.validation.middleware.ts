import { Request, Response, NextFunction } from "express";
import { HttpStatusCode, logger } from "@phoenix/common";

/**
 * Validate notification creation request body
 */
export const validateCreateNotification = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { user_id, title, message, type, data } = req.body;

  // Check required fields
  if (!user_id) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: "Field 'user_id' is required",
    });
  }

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: "Field 'title' is required and must be a non-empty string",
    });
  }

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: "Field 'message' is required and must be a non-empty string",
    });
  }

  // Validate title length
  if (title.length > 200) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: "Field 'title' must not exceed 200 characters",
    });
  }

  // Validate message length
  if (message.length > 5000) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: "Field 'message' must not exceed 5000 characters",
    });
  }

  // Validate type if provided
  const validTypes = [
    "hazard_alert",
    "cyber_threat",
    "system",
    "info",
    "warning",
    "error",
  ];
  if (type && !validTypes.includes(type)) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: `Field 'type' must be one of: ${validTypes.join(", ")}`,
    });
  }

  // Validate data if provided
  if (data && typeof data !== "object") {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: "Field 'data' must be an object",
    });
  }

  next();
};

/**
 * Validate pagination query parameters
 */
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const page = req.query.page;
  const limit = req.query.limit;

  if (page !== undefined) {
    const pageNum = parseInt(page as string);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "Query parameter 'page' must be a positive integer",
      });
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "Query parameter 'limit' must be a positive integer between 1 and 100",
      });
    }
  }

  next();
};

/**
 * Validate read status filter
 */
export const validateReadStatusFilter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const read = req.query.read;

  if (read !== undefined && read !== "" && read !== "true" && read !== "false") {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: "Query parameter 'read' must be either 'true' or 'false'",
    });
  }

  next();
};
