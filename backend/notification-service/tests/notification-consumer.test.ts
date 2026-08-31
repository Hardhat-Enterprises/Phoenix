import assert from "node:assert/strict";
import test from "node:test";
import { ConfirmChannel, ConsumeMessage } from "amqplib";
import { handleNotificationMessage } from "../src/rabbitmq/notification-consumer";
import { NotificationTopology } from "../src/rabbitmq/notification-topology";

const topology: NotificationTopology = {
  exchange: "notifications",
  queue: "notifications.queue",
  routingKey: "notification.#",
  retryExchange: "notifications.retry",
  retryQueue: "notifications.retry.queue",
  retryRoutingKey: "notification.retry",
  retryReturnRoutingKey: "notification.retry",
  deadLetterExchange: "notifications.dead",
  deadLetterQueue: "notifications.dead.queue",
  deadLetterRoutingKey: "notification.dead",
  retryDelayMs: 1000,
  maxRetries: 2,
};

const validEvent = {
  eventId: "event-1",
  eventType: "notification.test",
  recipientUserId: "user-1",
  title: "Test",
  message: "Test notification",
  occurredAt: "2026-08-12T00:00:00.000Z",
};

const createHarness = (
  headers: Record<string, unknown> = {},
  confirmError?: Error,
) => {
  const calls = {
    ack: 0,
    nack: [] as boolean[],
    publishHeaders: [] as Record<string, unknown>[],
  };
  const channel = {
    ack: () => {
      calls.ack += 1;
    },
    nack: (_message: ConsumeMessage, _allUpTo: boolean, requeue: boolean) => {
      calls.nack.push(requeue);
    },
    publish: (
      _exchange: string,
      _routingKey: string,
      _content: Buffer,
      options: { headers?: Record<string, unknown> },
    ) => {
      calls.publishHeaders.push(options.headers || {});
      return true;
    },
    waitForConfirms: async () => {
      if (confirmError) {
        throw confirmError;
      }
    },
  } as unknown as ConfirmChannel;
  const message = {
    content: Buffer.from(JSON.stringify(validEvent)),
    properties: { headers, contentType: "application/json" },
  } as ConsumeMessage;

  return { calls, channel, message };
};

test("acknowledges a valid event after processing succeeds", async () => {
  const { calls, channel, message } = createHarness();
  let processedEventId = "";

  await handleNotificationMessage(
    channel,
    message,
    async (event) => {
      processedEventId = event.eventId;
    },
    topology,
  );

  assert.equal(processedEventId, validEvent.eventId);
  assert.equal(calls.ack, 1);
  assert.deepEqual(calls.nack, []);
  assert.equal(calls.publishHeaders.length, 0);
});

test("dead-letters an invalid event without processing it", async () => {
  const { calls, channel, message } = createHarness();
  message.content = Buffer.from(
    JSON.stringify({ ...validEvent, occurredAt: "12 August 2026" }),
  );

  await handleNotificationMessage(
    channel,
    message,
    async () => assert.fail("processor must not be called"),
    topology,
  );

  assert.equal(calls.ack, 0);
  assert.deepEqual(calls.nack, [false]);
});

test("publishes a failed event to the retry queue and acknowledges the original", async () => {
  const { calls, channel, message } = createHarness();

  await handleNotificationMessage(
    channel,
    message,
    async () => {
      throw new Error("temporary persistence failure");
    },
    topology,
  );

  assert.equal(calls.publishHeaders.length, 1);
  assert.equal(calls.publishHeaders[0]["x-notification-retry-count"], 1);
  assert.equal(calls.ack, 1);
  assert.deepEqual(calls.nack, []);
});

test("dead-letters an event after the retry limit", async () => {
  const { calls, channel, message } = createHarness({
    "x-notification-retry-count": topology.maxRetries,
  });

  await handleNotificationMessage(
    channel,
    message,
    async () => {
      throw new Error("persistent failure");
    },
    topology,
  );

  assert.equal(calls.publishHeaders.length, 0);
  assert.equal(calls.ack, 0);
  assert.deepEqual(calls.nack, [false]);
});

test("requeues the original event when retry publication is not confirmed", async () => {
  const { calls, channel, message } = createHarness(
    {},
    new Error("publisher confirmation failed"),
  );

  await handleNotificationMessage(
    channel,
    message,
    async () => {
      throw new Error("temporary persistence failure");
    },
    topology,
  );

  assert.equal(calls.publishHeaders.length, 1);
  assert.equal(calls.ack, 0);
  assert.deepEqual(calls.nack, [true]);
});
