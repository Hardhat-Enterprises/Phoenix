import { Request, Response } from "express";
import { notificationGrpcClient } from "../grpc/notification.grpc";
import { HttpStatusCode, logger } from "@phoenix/common";

export const getHealth = (req: Request, res: Response) => {
  notificationGrpcClient.GetNotificationHealth({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetNotificationHealth: ${error}`);
      res
        .status(
          response.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .json({ message: "Error fetching notification health" });
    }
    return res
      .status(response.status || HttpStatusCode.HTTP_STATUS_OK)
      .json({ message: response?.message });
  });
};

export const getNotifications = (req: Request, res: Response) => {
  notificationGrpcClient.GetNotifications({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetNotifications: ${error}`);
      res
        .status(
          response.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .json({ message: "Error fetching notifications" });
    }
    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      message: response?.message,
      notifications: response?.notifications,
    });
  });
};
