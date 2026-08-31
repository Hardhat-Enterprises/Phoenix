import { HttpStatusCode, logger } from "@phoenix/common";
import { GetHealthDto, GetNotificationsDto } from "../dto/notification.dto";
import {
  GetHealthEntity,
  GetNotificationsEntity,
} from "../entity/notification.entity";

export const getHealth = (
  getHealthDto: GetHealthDto
): GetHealthEntity => {
  logger.info("Notification service health check", {
    event: "health_check",
    component: "notification-service",
    operation: "getHealth",
  });

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Notification service is running",
  };
};

export const getNotifications = (
  getNotificationsDto: GetNotificationsDto
): GetNotificationsEntity => {
  logger.info("Fetching notifications", {
    event: "notification_retrieval",
    component: "notification-service",
    operation: "getNotifications",
  });

  try {
    const response: GetNotificationsEntity = {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Notifications Fetched Successfully",
    };

    logger.info("Notifications fetched successfully", {
      event: "notification_retrieval_success",
      component: "notification-service",
      operation: "getNotifications",
      status: response.status,
    });

    return response;
  } catch (error) {
    logger.error("Failed to fetch notifications", {
      event: "notification_retrieval_error",
      component: "notification-service",
      operation: "getNotifications",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
};