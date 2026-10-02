import { ConfirmChannel } from "amqplib";
import {
  NOTIFICATION_REALTIME_EXCHANGE,
  NotificationRealtimeEvent,
  NotificationRealtimePayload,
} from "@phoenix/common/rabbitmq/notification-realtime-event";

export const publishRealtimeNotificationEvents = async (
  channel: ConfirmChannel,
  notifications: NotificationRealtimePayload[],
): Promise<void> => {
  if (notifications.length === 0) return;

  await channel.assertExchange(NOTIFICATION_REALTIME_EXCHANGE, "fanout", {
    durable: true,
  });

  for (const notification of notifications) {
    const event: NotificationRealtimeEvent = {
      type: "notification.created",
      notification,
    };
    channel.publish(
      NOTIFICATION_REALTIME_EXCHANGE,
      "",
      Buffer.from(JSON.stringify(event)),
      {
        contentType: "application/json",
        persistent: false,
      },
    );
  }

  await channel.waitForConfirms();
};
