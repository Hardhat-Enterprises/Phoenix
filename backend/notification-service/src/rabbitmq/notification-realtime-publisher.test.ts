import { ConfirmChannel } from "amqplib";
import { NOTIFICATION_REALTIME_EXCHANGE } from "@phoenix/common/rabbitmq/notification-realtime-event";
import { publishRealtimeNotificationEvents } from "./notification-realtime-publisher";

const notification = {
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

test("publishes each persisted notification to the real-time fan-out exchange", async () => {
  const channel = {
    assertExchange: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockReturnValue(true),
    waitForConfirms: jest.fn().mockResolvedValue(undefined),
  } as unknown as ConfirmChannel;

  await publishRealtimeNotificationEvents(channel, [notification]);

  expect(channel.assertExchange).toHaveBeenCalledWith(
    NOTIFICATION_REALTIME_EXCHANGE,
    "fanout",
    { durable: true },
  );
  expect(channel.publish).toHaveBeenCalledWith(
    NOTIFICATION_REALTIME_EXCHANGE,
    "",
    Buffer.from(JSON.stringify({ type: "notification.created", notification })),
    { contentType: "application/json", persistent: false },
  );
  expect(channel.waitForConfirms).toHaveBeenCalledTimes(1);
});

test("does not declare or publish the exchange when no notifications were created", async () => {
  const channel = {
    assertExchange: jest.fn(),
    publish: jest.fn(),
    waitForConfirms: jest.fn(),
  } as unknown as ConfirmChannel;

  await publishRealtimeNotificationEvents(channel, []);

  expect(channel.assertExchange).not.toHaveBeenCalled();
  expect(channel.publish).not.toHaveBeenCalled();
  expect(channel.waitForConfirms).not.toHaveBeenCalled();
});
