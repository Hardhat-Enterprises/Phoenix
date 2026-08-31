import { ConfirmChannel, ConsumeMessage } from "amqplib";
import { parseNotificationEvent } from "./notification-event";
import {
  assertNotificationTopology,
  NotificationTopology,
  notificationTopology,
} from "./notification-topology";
import { NotificationEvent } from "@phoenix/common/rabbitmq/notification-event";

export type NotificationEventProcessor = (
  event: NotificationEvent,
) => Promise<void>;

const RETRY_HEADER = "x-notification-retry-count";

const getRetryCount = (message: ConsumeMessage): number => {
  const value = message.properties.headers?.[RETRY_HEADER];
  return typeof value === "number" && Number.isInteger(value) ? value : 0;
};

export const handleNotificationMessage = async (
  channel: ConfirmChannel,
  message: ConsumeMessage,
  processEvent: NotificationEventProcessor,
  topology: NotificationTopology = notificationTopology,
): Promise<void> => {
  let event: NotificationEvent;

  try {
    event = parseNotificationEvent(message.content);
  } catch {
    channel.nack(message, false, false);
    return;
  }

  try {
    await processEvent(event);
    channel.ack(message);
  } catch {
    const retryCount = getRetryCount(message);

    if (retryCount >= topology.maxRetries) {
      channel.nack(message, false, false);
      return;
    }

    try {
      channel.publish(
        topology.retryExchange,
        topology.retryRoutingKey,
        message.content,
        {
          contentType: message.properties.contentType || "application/json",
          deliveryMode: 2,
          headers: {
            ...message.properties.headers,
            [RETRY_HEADER]: retryCount + 1,
          },
        },
      );
      await channel.waitForConfirms();
      channel.ack(message);
    } catch {
      channel.nack(message, false, true);
    }
  }
};

export const startNotificationConsumer = async (
  channel: ConfirmChannel,
  processEvent: NotificationEventProcessor,
  topology: NotificationTopology = notificationTopology,
): Promise<void> => {
  await assertNotificationTopology(channel, topology);
  await channel.prefetch(10);
  await channel.consume(
    topology.queue,
    async (message) => {
      if (message) {
        await handleNotificationMessage(
          channel,
          message,
          processEvent,
          topology,
        );
      }
    },
    { noAck: false },
  );
};
