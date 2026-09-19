import { Request, Response } from "express";

import { notificationGrpcClient } from "../grpc/notification.grpc";

import { HttpStatusCode, logger } from "@phoenix/common";

export const getHealth = (req: Request, res: Response) => {
  notificationGrpcClient.GetNotificationHealth({}, (error, response) => {
    if (error) {
      logger.error(
        `Error calling GetNotificationHealth: ${error.message}`,
      );

      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({
          message: "Error fetching notification health",
        });
    }

    logger.info(
      `Notification health response received: ${JSON.stringify(response)}`,
    );

    return res
      .status(response?.status || HttpStatusCode.HTTP_STATUS_OK)
      .json({
        message: response?.message || "Notification service is healthy",
      });
  });
};

export const getNotifications = (req: Request, res: Response) => {
  notificationGrpcClient.GetNotifications({}, (error, response) => {
    if (error) {
      logger.error(
        `Error calling GetNotifications: ${error.message}`,
      );

      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({
          message: "Error fetching notifications",
        });
    }

    logger.info(
      `Notifications response received: ${JSON.stringify(response)}`,
    );

    return res
      .status(response?.status || HttpStatusCode.HTTP_STATUS_OK)
      .json({
        message: response?.message || "Notifications fetched successfully",
        notifications: response?.notifications || [],
      });
  });
};
