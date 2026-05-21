import { GetHealthDto, GetNotificationsDto } from "../dto/notification.dto";
import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { getHealth, getNotifications } from "../services/notification.service";
import { GetHealthEntity, GetNotificationsEntity } from "../entity/notification.entity";
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
};
