import { Request, Response, NextFunction } from "express";
import { HttpStatusCode, logger } from "@phoenix/common";

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


const VALID_SEVERITIES = new Set(["low", "medium", "high", "critical"]);

const isValidIsoDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return false;
  return !Number.isNaN(new Date(value).getTime());
};

/**
 * Validate notification search and filtering query parameters
 */
export const validateNotificationFilters = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const keyword = req.query.keyword;
  const severity = req.query.severity;
  const eventType = req.query.event_type;
  const dateFrom = req.query.date_from;
  const dateTo = req.query.date_to;

  const scalarParams = { keyword, severity, event_type: eventType, date_from: dateFrom, date_to: dateTo };
  for (const [name, value] of Object.entries(scalarParams)) {
    if (value !== undefined && typeof value !== "string") {
      return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: `Query parameter '${name}' must be a single string value`,
      });
    }
  }

  if (typeof keyword === "string" && keyword.trim().length > 200) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: "Query parameter 'keyword' must not exceed 200 characters",
    });
  }

  if (typeof severity === "string" && severity.trim()) {
    const normalized = severity.trim().toLowerCase();
    if (!VALID_SEVERITIES.has(normalized)) {
      return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "Query parameter 'severity' must be one of: low, medium, high, critical",
      });
    }
  }

  if (typeof eventType === "string" && eventType.trim().length > 100) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: "Query parameter 'event_type' must not exceed 100 characters",
    });
  }

  if (typeof dateFrom === "string" && dateFrom.trim() && !isValidIsoDate(dateFrom.trim())) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: "Query parameter 'date_from' must be a valid ISO date or date-time",
    });
  }

  if (typeof dateTo === "string" && dateTo.trim() && !isValidIsoDate(dateTo.trim())) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: "Query parameter 'date_to' must be a valid ISO date or date-time",
    });
  }

  if (
    typeof dateFrom === "string" && dateFrom.trim() &&
    typeof dateTo === "string" && dateTo.trim() &&
    new Date(dateFrom.trim()).getTime() > new Date(dateTo.trim()).getTime()
  ) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: "Query parameter 'date_from' must be earlier than or equal to 'date_to'",
    });
  }

  next();
};
