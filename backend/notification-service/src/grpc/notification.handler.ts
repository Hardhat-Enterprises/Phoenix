import { GetHealthDto, GetNotificationsDto, CreateNotificationDto } from "../dto/notification.dto";
import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { getHealth, getNotifications, createNotification } from "../services/notification.service";
import { GetHealthEntity, GetNotificationsEntity, CreateNotificationEntity } from "../entity/notification.entity";
import { logger } from "@phoenix/common";

export const notificationHandler = {
  GetNotificationHealth: (
    call: ServerUnaryCall<GetHealthDto, GetHealthEntity>,
    callback: sendUnaryData<GetHealthEntity>,
  ) => {
    try {
      const response = getHealth(call.request);
      logger.info(`Notification service GetHealth response:${response}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },
  GetNotifications: (
    call: ServerUnaryCall<GetNotificationsDto, GetNotificationsEntity>,
    callback: sendUnaryData<GetNotificationsEntity>,
  ) => {
    try {
      const response = getNotifications(call.request);
      logger.info(`Notification service GetNotifications response:${response}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },
  CreateNotification: (
    call: ServerUnaryCall<CreateNotificationDto, CreateNotificationEntity>,
    callback: sendUnaryData<CreateNotificationEntity>,
  ) => {
    try {
      const response = createNotification(call.request);
      logger.info(`Notification service CreateNotification response:${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },
};
