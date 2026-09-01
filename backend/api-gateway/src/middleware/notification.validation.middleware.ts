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
