import {
  DeleteNotificationDto,
  GetHealthDto,
  GetNotificationsDto,
  GetUnreadNotificationCountDto,
  MarkAllNotificationsAsReadDto,
  MarkNotificationAsReadDto,
} from "../dto/notification.dto";
import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
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
  GetNotifications: async (
    call: ServerUnaryCall<GetNotificationsDto, GetNotificationsEntity>,
    callback: sendUnaryData<GetNotificationsEntity>,
  ) => {
    try {
      callback(null, await getNotifications(call.request));
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },
  GetUnreadNotificationCount: async (
    call: ServerUnaryCall<GetUnreadNotificationCountDto, GetUnreadNotificationCountEntity>,
    callback: sendUnaryData<GetUnreadNotificationCountEntity>,
  ) => {
    try {
      callback(null, await getUnreadNotificationCount(call.request));
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
  },
  MarkNotificationAsRead: async (
    call: ServerUnaryCall<MarkNotificationAsReadDto, MarkNotificationAsReadEntity>,
    callback: sendUnaryData<MarkNotificationAsReadEntity>,
  ) => {
    try {
      callback(null, await markNotificationAsRead(call.request));
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
  },
  MarkAllNotificationsAsRead: async (
    call: ServerUnaryCall<MarkAllNotificationsAsReadDto, MarkAllNotificationsAsReadEntity>,
    callback: sendUnaryData<MarkAllNotificationsAsReadEntity>,
  ) => {
    try {
      callback(null, await markAllNotificationsAsRead(call.request));
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
  },
  DeleteNotification: async (
    call: ServerUnaryCall<DeleteNotificationDto, DeleteNotificationEntity>,
    callback: sendUnaryData<DeleteNotificationEntity>,
  ) => {
    try {
      callback(null, await deleteNotification(call.request));
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
  },
};
