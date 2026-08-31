import { HttpStatusCode, logger } from "@phoenix/common";
import { GetHealthDto, GetNotificationsDto } from "../dto/notification.dto";
import { GetHealthEntity, GetNotificationsEntity } from "../entity/notification.entity";
import type { NotificationEventProcessor } from "../rabbitmq/notification-consumer";

export const getHealth = (getHealthDto: GetHealthDto): GetHealthEntity => {
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Notification service is running",
  };
};

export const getNotifications = (getNotificationsDto: GetNotificationsDto): GetNotificationsEntity => {
  logger.info("Fetching notifications from database...");
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Notifications fetched successfully",
  };
};

export const processNotificationEvent: NotificationEventProcessor = async (
  event,
): Promise<void> => {
  try {
    // Member 2's create-notification operation will be called here once available.
    logger.info(`Validated notification event: ${JSON.stringify(event)}`);
  } catch (error) {
    logger.error(`Notification event processing failed: ${error}`);
    throw error;
  }
};
