import { Channel, ConsumeMessage } from "amqplib";
import {
  NOTIFICATION_REALTIME_EXCHANGE,
  NotificationRealtimePayload,
} from "@phoenix/common/rabbitmq/notification-realtime-event";
import { startNotificationRealtimeConsumer } from "./notification-realtime-consumer";

jest.mock("@phoenix/common", () => ({
  logger: { warn: jest.fn() },
}));

const notification: NotificationRealtimePayload = {
  id: "notification-1",
  user_id: "user-1",
  event_id: "event-1",
  event_type: "notification.hazard.critical.v1",
  title: "Critical hazard",
  message: "A critical hazard was detected",
  metadata: "{}",
  is_read: false,
  read_at: "",
  created_at: "2026-09-20T00:00:00.000Z",
  updated_at: "2026-09-20T00:00:00.000Z",
  deleted_at: "",
};

const createChannel = () => {
  let consumer: ((message: ConsumeMessage | null) => void) | undefined;
  const channel = {
    assertExchange: jest.fn().mockResolvedValue(undefined),
    assertQueue: jest.fn().mockResolvedValue({ queue: "gateway.realtime" }),
    bindQueue: jest.fn().mockResolvedValue(undefined),
    consume: jest.fn().mockImplementation(async (_queue, callback) => {
      consumer = callback;
      return { consumerTag: "consumer" };
    }),
    ack: jest.fn(),
    nack: jest.fn(),
  } as unknown as Channel;

  return { channel, getConsumer: () => consumer };
};

test("forwards a valid persisted notification to the WebSocket gateway", async () => {
  const { channel, getConsumer } = createChannel();
  const onNotificationCreated = jest.fn();

  await startNotificationRealtimeConsumer(channel, onNotificationCreated);
  getConsumer()?.({
    content: Buffer.from(JSON.stringify({ type: "notification.created", notification })),
  } as ConsumeMessage);

  expect(channel.assertExchange).toHaveBeenCalledWith(
    NOTIFICATION_REALTIME_EXCHANGE,
    "fanout",
    { durable: true },
  );
  expect(onNotificationCreated).toHaveBeenCalledWith(notification);
  expect(channel.ack).toHaveBeenCalledTimes(1);
  expect(channel.nack).not.toHaveBeenCalled();
});

test("discards malformed real-time messages", async () => {
  const { channel, getConsumer } = createChannel();

  await startNotificationRealtimeConsumer(channel, jest.fn());
  getConsumer()?.({ content: Buffer.from("not JSON") } as ConsumeMessage);

  expect(channel.ack).not.toHaveBeenCalled();
  expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, false);
});
