import { Channel } from "amqplib";

export interface NotificationTopology {
  exchange: string;
  queue: string;
  routingKey: string;
  retryExchange: string;
  retryQueue: string;
  retryRoutingKey: string;
  retryReturnRoutingKey: string;
  deadLetterExchange: string;
  deadLetterQueue: string;
  deadLetterRoutingKey: string;
  retryDelayMs: number;
  maxRetries: number;
}

export const notificationTopology: NotificationTopology = {
  exchange: process.env.NOTIFICATION_EXCHANGE || "phoenix.notifications",
  queue: process.env.NOTIFICATION_QUEUE || "notification-service.events",
  routingKey: process.env.NOTIFICATION_ROUTING_KEY || "notification.#",
  retryExchange:
    process.env.NOTIFICATION_RETRY_EXCHANGE || "phoenix.notifications.retry",
  retryQueue:
    process.env.NOTIFICATION_RETRY_QUEUE || "notification-service.events.retry",
  retryRoutingKey:
    process.env.NOTIFICATION_RETRY_ROUTING_KEY || "notification.retry",
  retryReturnRoutingKey:
    process.env.NOTIFICATION_RETRY_RETURN_ROUTING_KEY || "notification.retry",
  deadLetterExchange:
    process.env.NOTIFICATION_DEAD_LETTER_EXCHANGE || "phoenix.notifications.dlx",
  deadLetterQueue:
    process.env.NOTIFICATION_DEAD_LETTER_QUEUE || "notification-service.events.dead",
  deadLetterRoutingKey:
    process.env.NOTIFICATION_DEAD_LETTER_ROUTING_KEY || "notification.dead",
  retryDelayMs: Number(process.env.NOTIFICATION_RETRY_DELAY_MS || 5000),
  maxRetries: Number(process.env.NOTIFICATION_MAX_RETRIES || 3),
};

export const assertNotificationTopology = async (
  channel: Channel,
  topology: NotificationTopology = notificationTopology,
): Promise<void> => {
  await channel.assertExchange(topology.exchange, "topic", { durable: true });
  await channel.assertExchange(topology.retryExchange, "direct", {
    durable: true,
  });
  await channel.assertExchange(topology.deadLetterExchange, "direct", {
    durable: true,
  });

  await channel.assertQueue(topology.queue, {
    durable: true,
    deadLetterExchange: topology.deadLetterExchange,
    deadLetterRoutingKey: topology.deadLetterRoutingKey,
  });
  await channel.bindQueue(
    topology.queue,
    topology.exchange,
    topology.routingKey,
  );

  await channel.assertQueue(topology.retryQueue, {
    durable: true,
    messageTtl: topology.retryDelayMs,
    deadLetterExchange: topology.exchange,
    deadLetterRoutingKey: topology.retryReturnRoutingKey,
  });
  await channel.bindQueue(
    topology.retryQueue,
    topology.retryExchange,
    topology.retryRoutingKey,
  );

  await channel.assertQueue(topology.deadLetterQueue, { durable: true });
  await channel.bindQueue(
    topology.deadLetterQueue,
    topology.deadLetterExchange,
    topology.deadLetterRoutingKey,
  );
};
