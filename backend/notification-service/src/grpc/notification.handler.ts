import {
  GetHealthDto,
  GetNotificationsDto,
} from "../dto/notification.dto";

import {
  ServerUnaryCall,
  sendUnaryData,
} from "@grpc/grpc-js";

import {
  getHealth,
  getNotifications,
} from "../services/notification.service";

import {
  GetHealthEntity,
  GetNotificationsEntity,
} from "../entity/notification.entity";

import { logger } from "@phoenix/common";

export const notificationHandler = {
  GetNotificationHealth: (
    call: ServerUnaryCall<GetHealthDto, GetHealthEntity>,
    callback: sendUnaryData<GetHealthEntity>,
  ) => {
    try {
      const response = getHealth(call.request);

      logger.info(
        `Notification service GetHealth response: ${JSON.stringify(response)}`,
      );

      callback(null, response);
    } catch (error) {
      logger.error(
        `Notification service GetHealth failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      callback({
        code: 13,
        message: "Internal server error",
      });
    }
  },

  GetNotifications: (
    call: ServerUnaryCall<
      GetNotificationsDto,
      GetNotificationsEntity
    >,
    callback: sendUnaryData<GetNotificationsEntity>,
  ) => {
    try {
      const response = getNotifications(call.request);

      logger.info(
        `Notification service GetNotifications response: ${JSON.stringify(
          response,
        )}`,
      );

      callback(null, response);
    } catch (error) {
      logger.error(
        `Notification service GetNotifications failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      callback({
        code: 13,
        message: "Internal server error",
      });
    }
  },
};
