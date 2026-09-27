import { Request, Response } from "express";
import { HttpStatusCode, logger } from "@phoenix/common";
import { notificationGrpcClient } from "../grpc/notification.grpc";
import { NotificationWebSocketGateway } from "../realtime/notification-websocket";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const queryString = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  return "";
};

const parsePositiveInteger = (
  value: unknown,
  fallback: number,
  fieldName: string,
  max?: number,
): { value?: number; error?: string } => {
  if (value === undefined || value === null || value === "") {
    return { value: fallback };
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return { error: `${fieldName} must be a positive integer` };
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return { error: `${fieldName} must be a positive integer` };
  }

  if (max && parsed > max) {
    return { error: `${fieldName} must be between 1 and ${max}` };
  }

  return { value: parsed };
};

export const getHealth = (_req: Request, res: Response) => {
  notificationGrpcClient.GetNotificationHealth({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetNotificationHealth: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching notification health" });
    }

    return res
      .status(response?.status || HttpStatusCode.HTTP_STATUS_OK)
      .json({ message: response?.message });
  });
};

export const getNotifications = (req: Request, res: Response) => {
  const pageResult = parsePositiveInteger(
    req.query.page,
    DEFAULT_PAGE,
    "page",
  );
  const limitResult = parsePositiveInteger(
    req.query.limit,
    DEFAULT_LIMIT,
    "limit",
    MAX_LIMIT,
  );

  const validationError = pageResult.error || limitResult.error;
  if (validationError) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: validationError,
      notifications: [],
      total: 0,
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
    });
  }

  const grpcRequest = {
    keyword: queryString(req.query.keyword),
    severity: queryString(req.query.severity),
    event_type: queryString(req.query.event_type),
    date_from: queryString(req.query.date_from),
    date_to: queryString(req.query.date_to),
    page: pageResult.value || DEFAULT_PAGE,
    limit: limitResult.value || DEFAULT_LIMIT,
  };

  notificationGrpcClient.GetNotifications(
    grpcRequest,
    (error, response) => {
      if (error) {
        logger.error(`Error calling GetNotifications: ${error}`);
        return res
          .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
          .json({ message: "Error fetching notifications" });
      }

      return res
        .status(response?.status || HttpStatusCode.HTTP_STATUS_OK)
        .json({
          status: response?.status || HttpStatusCode.HTTP_STATUS_OK,
          message: response?.message,
          notifications: response?.notifications || [],
          total: response?.total || 0,
          page: response?.page || grpcRequest.page,
          limit: response?.limit || grpcRequest.limit,
        });
    },
  );
};
