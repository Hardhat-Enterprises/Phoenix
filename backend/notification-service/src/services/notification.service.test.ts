const notificationModel = {
  findAndCountAll: jest.fn(),
  count: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  findOrCreate: jest.fn(),
  bulkCreate: jest.fn(),
};

jest.mock("@phoenix/common", () => ({
  HttpStatusCode: {
    HTTP_STATUS_OK: 200,
    HTTP_STATUS_CREATED: 201,
    HTTP_STATUS_NOT_FOUND: 404,
  },
  Notification: notificationModel,
  logger: { info: jest.fn(), error: jest.fn() },
}));

jest.mock("../grpc/user.grpc", () => ({
  getNotificationRecipientIds: jest.fn(),
}));

import {
  getNotifications,
  processNotificationEvent,
} from "./notification.service";
import { getNotificationRecipientIds } from "../grpc/user.grpc";

const notification = {
  id: "notification-1",
  user_id: "user-1",
  event_id: "event-1",
  event_type: "notification.test",
  title: "Test",
  message: "Test notification",
  metadata: { severity: "critical" },
  is_read: false,
  read_at: null,
  created_at: new Date("2026-08-12T00:00:00.000Z"),
  updated_at: new Date("2026-08-12T00:00:00.000Z"),
  deleted_at: null,
};

beforeEach(() => jest.clearAllMocks());

test("retrieves only the authenticated user's requested notification page", async () => {
  notificationModel.findAndCountAll.mockResolvedValue({ count: 1, rows: [notification] });

  const response = await getNotifications({
    user_id: "user-1",
    page: 2,
    limit: 10,
    has_is_read: true,
    is_read: false,
  });

  expect(notificationModel.findAndCountAll).toHaveBeenCalledWith({
    where: { user_id: "user-1", is_read: false },
    order: [["created_at", "DESC"]],
    limit: 10,
    offset: 10,
  });
  expect(response).toMatchObject({
    status: 200,
    total: 1,
    page: 2,
    total_pages: 1,
  });
  expect(response.notifications[0]).toMatchObject({
    id: "notification-1",
    metadata: JSON.stringify(notification.metadata),
  });
});

test("fans out a RabbitMQ event to every user with per-user idempotency", async () => {
  (getNotificationRecipientIds as jest.Mock).mockResolvedValue(["user-1", "user-2"]);
  notificationModel.bulkCreate.mockResolvedValue([]);

  await processNotificationEvent({
    eventId: "event-1",
    eventType: "notification.hazard.critical.v1",
    title: "Critical hazard",
    message: "A critical hazard was detected",
    occurredAt: "2026-08-12T00:00:00.000Z",
    metadata: { hazardId: "hazard-1" },
  });

  expect(notificationModel.bulkCreate).toHaveBeenCalledWith(
    [
      {
        event_id: "event-1",
        user_id: "user-1",
        event_type: "notification.hazard.critical.v1",
        title: "Critical hazard",
        message: "A critical hazard was detected",
        metadata: {
          hazardId: "hazard-1",
          occurredAt: "2026-08-12T00:00:00.000Z",
        },
      },
      {
        event_id: "event-1",
        user_id: "user-2",
      event_type: "notification.hazard.critical.v1",
      title: "Critical hazard",
      message: "A critical hazard was detected",
      metadata: {
        hazardId: "hazard-1",
        occurredAt: "2026-08-12T00:00:00.000Z",
      },
      },
    ],
    { ignoreDuplicates: true },
  );
});

test("uses the database unique key to make repeated event delivery idempotent", async () => {
  (getNotificationRecipientIds as jest.Mock).mockResolvedValue(["user-1"]);
  notificationModel.bulkCreate.mockResolvedValue([]);

  await processNotificationEvent({
    eventId: "event-1",
    eventType: "notification.hazard.critical.v1",
    title: "Critical hazard",
    message: "A critical hazard was detected",
    occurredAt: "2026-08-12T00:00:00.000Z",
  });

  expect(notificationModel.bulkCreate).toHaveBeenCalledWith(
    expect.any(Array),
    { ignoreDuplicates: true },
  );
});
