import { HttpStatusCode, logger } from "@phoenix/common";
import { GetHealthDto, GetNotificationsDto } from "../dto/notification.dto";
import { GetHealthEntity, GetNotificationsEntity } from "../entity/notification.entity";

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
