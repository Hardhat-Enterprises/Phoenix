import {
  DeleteNotificationDto,
  GetHealthDto,
  GetNotificationsDto,
  GetUnreadNotificationCountDto,
  MarkAllNotificationsAsReadDto,
  MarkNotificationAsReadDto,
} from "../dto/notification.dto";

import {
  ServerUnaryCall,
  sendUnaryData,
} from "@grpc/grpc-js";

import {
  deleteNotification,
  getHealth,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notification.service";

import {
  DeleteNotificationEntity,
  GetHealthEntity,
  GetNotificationsEntity,
  GetUnreadNotificationCountEntity,
  MarkAllNotificationsAsReadEntity,
  MarkNotificationAsReadEntity,
} from "../entity/notification.entity";

import { logger } from "@phoenix/common";

const grpcError = (error: unknown): { code: 13; message: string } => ({
  code: 13,
  message: error instanceof Error ? error.message : String(error),
});

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
        `Notification service GetHealth error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      callback(grpcError(error));
    }
  },

  GetNotifications: async (
    call: ServerUnaryCall<GetNotificationsDto, GetNotificationsEntity>,
    callback: sendUnaryData<GetNotificationsEntity>,
  ) => {
    try {
      const response = await getNotifications(call.request);

      logger.info(
        `Notification service GetNotifications response: ${JSON.stringify(response)}`,
      );

      callback(null, response);
    } catch (error) {
      logger.error(
        `Notification service GetNotifications error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      callback(grpcError(error));
    }
  },

  GetUnreadNotificationCount: async (
    call: ServerUnaryCall<
      GetUnreadNotificationCountDto,
      GetUnreadNotificationCountEntity
    >,
    callback: sendUnaryData<GetUnreadNotificationCountEntity>,
  ) => {
    try {
      const response = await getUnreadNotificationCount(call.request);

      logger.info(
        `Notification service GetUnreadNotificationCount response: ${JSON.stringify(response)}`,
      );

      callback(null, response);
    } catch (error) {
      logger.error(
        `Notification service GetUnreadNotificationCount error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      callback(grpcError(error));
    }
  },

  MarkNotificationAsRead: async (
    call: ServerUnaryCall<
      MarkNotificationAsReadDto,
      MarkNotificationAsReadEntity
    >,
    callback: sendUnaryData<MarkNotificationAsReadEntity>,
  ) => {
    try {
      const response = await markNotificationAsRead(call.request);

      logger.info(
        `Notification service MarkNotificationAsRead response: ${JSON.stringify(response)}`,
      );

      callback(null, response);
    } catch (error) {
      logger.error(
        `Notification service MarkNotificationAsRead error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      callback(grpcError(error));
    }
  },

  MarkAllNotificationsAsRead: async (
    call: ServerUnaryCall<
      MarkAllNotificationsAsReadDto,
      MarkAllNotificationsAsReadEntity
    >,
    callback: sendUnaryData<MarkAllNotificationsAsReadEntity>,
  ) => {
    try {
      const response = await markAllNotificationsAsRead(call.request);

      logger.info(
        `Notification service MarkAllNotificationsAsRead response: ${JSON.stringify(response)}`,
      );

      callback(null, response);
    } catch (error) {
      logger.error(
        `Notification service MarkAllNotificationsAsRead error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      callback(grpcError(error));
    }
  },

  DeleteNotification: async (
    call: ServerUnaryCall<
      DeleteNotificationDto,
      DeleteNotificationEntity
    >,
    callback: sendUnaryData<DeleteNotificationEntity>,
  ) => {
    try {
      const response = await deleteNotification(call.request);

      logger.info(
        `Notification service DeleteNotification response: ${JSON.stringify(response)}`,
      );

      callback(null, response);
    } catch (error) {
      logger.error(
        `Notification service DeleteNotification error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      callback(grpcError(error));
    }
  },
};
