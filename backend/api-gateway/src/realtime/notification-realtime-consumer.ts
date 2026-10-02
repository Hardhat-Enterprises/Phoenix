import { Channel, ConsumeMessage } from "amqplib";
import { logger } from "@phoenix/common";
import {
  NOTIFICATION_REALTIME_EXCHANGE,
  NotificationRealtimeEvent,
  NotificationRealtimePayload,
} from "@phoenix/common/rabbitmq/notification-realtime-event";

export type NotificationCreatedHandler = (
  notification: NotificationRealtimePayload,
) => void;

const isNotificationRealtimeEvent = (
  value: unknown,
): value is NotificationRealtimeEvent => {
  if (!value || typeof value !== "object") return false;

  const event = value as Partial<NotificationRealtimeEvent>;
  const notification = event.notification as Partial<NotificationRealtimePayload> | undefined;
  return (
    event.type === "notification.created" &&
    !!notification &&
    typeof notification.id === "string" &&
    typeof notification.user_id === "string" &&
    typeof notification.event_id === "string" &&
    typeof notification.event_type === "string" &&
    typeof notification.title === "string" &&
    typeof notification.message === "string" &&
    typeof notification.metadata === "string" &&
    typeof notification.is_read === "boolean" &&
    typeof notification.read_at === "string" &&
    typeof notification.created_at === "string" &&
    typeof notification.updated_at === "string" &&
    typeof notification.deleted_at === "string"
  );
};

const parseNotificationRealtimeEvent = (
  message: ConsumeMessage,
): NotificationRealtimeEvent => {
  let value: unknown;
  try {
    value = JSON.parse(message.content.toString("utf-8"));
  } catch {
    throw new Error("Notification real-time event must contain valid JSON");
  }

  if (!isNotificationRealtimeEvent(value)) {
    throw new Error("Notification real-time event has an invalid payload");
  }

  return value;
};

export const startNotificationRealtimeConsumer = async (
  channel: Channel,
  onNotificationCreated: NotificationCreatedHandler,
): Promise<void> => {
  await channel.assertExchange(NOTIFICATION_REALTIME_EXCHANGE, "fanout", {
    durable: true,
  });
  const { queue } = await channel.assertQueue("", {
    exclusive: true,
    autoDelete: true,
  });
  await channel.bindQueue(queue, NOTIFICATION_REALTIME_EXCHANGE, "");

  await channel.consume(
    queue,
    (message) => {
      if (!message) return;

      try {
        const event = parseNotificationRealtimeEvent(message);
        onNotificationCreated(event.notification);
        channel.ack(message);
      } catch (error) {
        logger.warn(`Discarding invalid notification real-time event: ${error}`);
        channel.nack(message, false, false);
      }
    },
    { noAck: false },
  );
};
