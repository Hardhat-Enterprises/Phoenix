import { AddressInfo } from "net";
import { createServer } from "http";
import WebSocket from "ws";

const getAuthenticatedUserFromToken = jest.fn();
const getNotifications = jest.fn();
const getUnreadNotificationCount = jest.fn();

jest.mock("../middleware/auth.middleware", () => ({
  getAuthenticatedUserFromToken,
}));

jest.mock("../grpc/notification.grpc", () => ({
  notificationGrpcClient: {
    GetNotifications: getNotifications,
    GetUnreadNotificationCount: getUnreadNotificationCount,
  },
}));

jest.mock("@phoenix/common", () => ({
  logger: { error: jest.fn(), warn: jest.fn() },
}));

import { NotificationWebSocketGateway } from "./notification-websocket";

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

const listen = (server: ReturnType<typeof createServer>): Promise<AddressInfo> =>
  new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address() as AddressInfo));
  });

const close = (server: ReturnType<typeof createServer>): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

beforeEach(() => {
  jest.clearAllMocks();
  getAuthenticatedUserFromToken.mockResolvedValue({ user_id: "user-1" });
  getNotifications.mockImplementation((_request, callback) => {
    callback(null, {
      notifications: [notification],
      total: 1,
      page: 1,
      limit: 10,
      total_pages: 1,
    });
  });
  getUnreadNotificationCount.mockImplementation((_request, callback) => {
    callback(null, { unread_count: 1 });
  });
});

test("authenticates a connection, sends a snapshot and fans out matching notifications", async () => {
  const server = createServer();
  const gateway = new NotificationWebSocketGateway(server);
  const address = await listen(server);
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/api/notifications/ws`);
  const messages: Array<{ type: string; data?: Record<string, unknown> }> = [];

  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });

    const snapshotReceived = new Promise<void>((resolve) => {
      socket.on("message", (data) => {
        const message = JSON.parse(data.toString()) as {
          type: string;
          data?: Record<string, unknown>;
        };
        messages.push(message);
        if (message.type === "notifications:snapshot") resolve();
      });
    });
    socket.send(JSON.stringify({ type: "authenticate", token: "Bearer token-1" }));
    await snapshotReceived;

    const createdReceived = new Promise<void>((resolve) => {
      socket.on("message", (data) => {
        if (JSON.parse(data.toString()).type === "notification:created") resolve();
      });
    });
    gateway.broadcastCreated(notification);
    await createdReceived;

    expect(getAuthenticatedUserFromToken).toHaveBeenCalledWith("token-1");
    expect(getNotifications).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        page: 1,
        limit: 10,
        has_is_read: false,
        is_read: false,
      },
      expect.any(Function),
    );
    expect(messages).toEqual(expect.arrayContaining([
      { type: "notification:authenticated" },
      expect.objectContaining({
        type: "notifications:snapshot",
        data: expect.objectContaining({ unreadCount: 1 }),
      }),
      { type: "notification:created", data: { notification } },
    ]));
  } finally {
    socket.close();
    await new Promise((resolve) => socket.once("close", resolve));
    await close(server);
  }
});
