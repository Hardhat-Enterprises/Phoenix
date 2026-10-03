import { ConfirmChannel } from "amqplib";
import { Op, Sequelize, WhereOptions } from "sequelize";
import { HttpStatusCode, logger, Notification } from "@phoenix/common";
import { NotificationEvent } from "@phoenix/common/rabbitmq/notification-event";
import { NotificationRealtimePayload } from "@phoenix/common/rabbitmq/notification-realtime-event";
import {
  DeleteNotificationDto,
  GetHealthDto,
  GetNotificationsDto,
  GetUnreadNotificationCountDto,
  MarkAllNotificationsAsReadDto,
  MarkNotificationAsReadDto,
} from "../dto/notification.dto";
import {
  DeleteNotificationEntity,
  GetHealthEntity,
  GetNotificationsEntity,
  GetUnreadNotificationCountEntity,
  MarkAllNotificationsAsReadEntity,
  MarkNotificationAsReadEntity,
  NotificationEntity,
} from "../entity/notification.entity";
import type { NotificationEventProcessor } from "../rabbitmq/notification-consumer";
import { getNotificationRecipientIds } from "../grpc/user.grpc";
import { publishRealtimeNotificationEvents } from "../rabbitmq/notification-realtime-publisher";

const toIsoString = (value: Date | null | undefined): string =>
  value ? value.toISOString() : "";

const toNotificationEntity = (notification: Notification): NotificationEntity => ({
  id: notification.id,
  user_id: notification.user_id,
  event_id: notification.event_id,
  event_type: notification.event_type,
  title: notification.title,
  message: notification.message,
  metadata: notification.metadata ? JSON.stringify(notification.metadata) : "",
  is_read: notification.is_read,
  read_at: toIsoString(notification.read_at),
  created_at: toIsoString(notification.created_at),
  updated_at: toIsoString(notification.updated_at),
  deleted_at: toIsoString(notification.deleted_at),
});

export const getHealth = (_dto: GetHealthDto): GetHealthEntity => ({
  status: HttpStatusCode.HTTP_STATUS_OK,
  message: "Notification service is running",
});

export const getNotifications = async (
  dto: GetNotificationsDto,
): Promise<GetNotificationsEntity> => {
  const keyword = (dto.keyword || "").trim();
  const severity = (dto.severity || "").trim().toLowerCase();
  const eventType = (dto.event_type || "").trim();
  const dateFrom = (dto.date_from || "").trim();
  const dateTo = (dto.date_to || "").trim();

  const parseFilterDate = (value: string, endOfDay = false): Date => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
    }
    return new Date(value);
  };

  const andConditions: any[] = [];

  if (dto.has_is_read) {
    andConditions.push({ is_read: dto.is_read });
  }

  if (keyword) {
    andConditions.push({
      [Op.or]: [
        { title: { [Op.iLike]: `%${keyword}%` } },
        { message: { [Op.iLike]: `%${keyword}%` } },
        { event_type: { [Op.iLike]: `%${keyword}%` } },
      ],
    });
  }

  if (severity) {
    andConditions.push(
      Sequelize.where(
        Sequelize.fn(
          "LOWER",
          Sequelize.cast(Sequelize.json("metadata.severity"), "text"),
        ),
        severity,
      ),
    );
  }

  if (eventType) {
    andConditions.push({ event_type: eventType });
  }

  if (dateFrom || dateTo) {
    const createdAt: Record<symbol, Date> = {};
    if (dateFrom) createdAt[Op.gte] = parseFilterDate(dateFrom);
    if (dateTo) createdAt[Op.lte] = parseFilterDate(dateTo, true);
    andConditions.push({ created_at: createdAt });
  }

  const where: WhereOptions = {
    user_id: dto.user_id,
    ...(andConditions.length > 0 ? { [Op.and]: andConditions } : {}),
  };

  const { count, rows } = await Notification.findAndCountAll({
    where,
    order: [
      ["created_at", "DESC"],
      ["id", "DESC"],
    ],
    limit: dto.limit,
    offset: (dto.page - 1) * dto.limit,
  });

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Notifications retrieved successfully",
    notifications: rows.map(toNotificationEntity),
    total: count,
    page: dto.page,
    limit: dto.limit,
    total_pages: Math.ceil(count / dto.limit),
  };
};

export const getUnreadNotificationCount = async (
  dto: GetUnreadNotificationCountDto,
): Promise<GetUnreadNotificationCountEntity> => ({
  status: HttpStatusCode.HTTP_STATUS_OK,
  message: "Unread notification count retrieved",
  unread_count: await Notification.count({
    where: { user_id: dto.user_id, is_read: false },
  }),
});

export const markNotificationAsRead = async (
  dto: MarkNotificationAsReadDto,
): Promise<MarkNotificationAsReadEntity> => {
  const notification = await Notification.findOne({
    where: { id: dto.notification_id, user_id: dto.user_id },
  });
  if (!notification) {
    return { status: HttpStatusCode.HTTP_STATUS_NOT_FOUND, message: "Notification not found" };
  }

  if (!notification.is_read) {
    notification.is_read = true;
    notification.read_at = new Date();
    await notification.save();
  }

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Notification marked as read",
    notification: toNotificationEntity(notification),
  };
};

export const markAllNotificationsAsRead = async (
  dto: MarkAllNotificationsAsReadDto,
): Promise<MarkAllNotificationsAsReadEntity> => {
  const [updatedCount] = await Notification.update(
    { is_read: true, read_at: new Date() },
    { where: { user_id: dto.user_id, is_read: false } },
  );
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "All notifications marked as read",
    updated_count: updatedCount,
  };
};

export const deleteNotification = async (
  dto: DeleteNotificationDto,
): Promise<DeleteNotificationEntity> => {
  const notification = await Notification.findOne({
    where: { id: dto.notification_id, user_id: dto.user_id },
  });
  if (!notification) {
    return { status: HttpStatusCode.HTTP_STATUS_NOT_FOUND, message: "Notification not found" };
  }

  await notification.destroy();
  return { status: HttpStatusCode.HTTP_STATUS_OK, message: "Notification deleted successfully" };
};

export const processNotificationEvent = async (
  event: NotificationEvent,
): Promise<NotificationRealtimePayload[]> => {
  try {
    const recipientUserIds = await getNotificationRecipientIds();
    if (recipientUserIds.length === 0) {
      logger.warn(`No recipients found for notification event ${event.eventId}`);
      return [];
    }

    const notifications = await Notification.bulkCreate(
      recipientUserIds.map((user_id) => ({
        event_id: event.eventId,
        user_id,
        event_type: event.eventType,
        title: event.title,
        message: event.message,
        metadata: { ...event.metadata, occurredAt: event.occurredAt },
      })),
      { ignoreDuplicates: true },
    );
    logger.info(
      `Processed global notification event ${event.eventId} for ${recipientUserIds.length} users`,
    );
    return notifications.map(toNotificationEntity);
  } catch (error) {
    logger.error(`Notification event processing failed: ${error}`);
    throw error;
  }
};

export const createNotificationEventProcessor = (
  channel: ConfirmChannel,
): NotificationEventProcessor => async (event) => {
  const notifications = await processNotificationEvent(event);

  try {
    await publishRealtimeNotificationEvents(channel, notifications);
  } catch (error) {
    logger.warn(
      `Notification ${event.eventId} was persisted but could not be published for real-time delivery: ${error}`,
    );
  }
};
