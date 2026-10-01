import { Server as HttpServer } from "http";
import {
  GetNotificationsResponse,
  GetUnreadNotificationCountResponse,
  NotificationItem,
  notificationGrpcClient,
} from "../grpc/notification.grpc";
import { getAuthenticatedUserFromToken } from "../middleware/auth.middleware";
import { logger } from "@phoenix/common";
import { RawData, WebSocket, WebSocketServer } from "ws";

const NOTIFICATION_WEBSOCKET_PATH = "/api/notifications/ws";
const AUTHENTICATION_TIMEOUT_MS = 10_000;

interface NotificationSubscription {
  page: number;
  limit: number;
  read?: boolean;
}

interface WebSocketMessage {
  type?: unknown;
  token?: unknown;
  page?: unknown;
  limit?: unknown;
  read?: unknown;
}

interface WebSocketConnectionState {
  userId?: string;
  authenticating: boolean;
  authenticationTimeout: NodeJS.Timeout;
  subscription: NotificationSubscription;
}

const defaultSubscription: NotificationSubscription = {
  page: 1,
  limit: 10,
};

const send = (socket: WebSocket, payload: Record<string, unknown>): void => {
  if (socket.readyState !== WebSocket.OPEN) return;

  try {
    socket.send(JSON.stringify(payload));
  } catch (error) {
    logger.warn(`Unable to send notification WebSocket message: ${error}`);
  }
};

const sendError = (socket: WebSocket, message: string): void => {
  send(socket, { type: "error", message });
};

const parseMessage = (data: RawData): WebSocketMessage | undefined => {
  try {
    const value: unknown = JSON.parse(data.toString());
    return value && typeof value === "object" ? (value as WebSocketMessage) : undefined;
  } catch {
    return undefined;
  }
};

const getPositiveInteger = (
  value: unknown,
  fallback: number,
  maximum: number,
): number | undefined => {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  if (value < 1 || value > maximum) return undefined;
  return value;
};

const normaliseToken = (value: string): string =>
  value.startsWith("Bearer ") ? value.slice("Bearer ".length) : value;

const getNotifications = (
  userId: string,
  subscription: NotificationSubscription,
): Promise<GetNotificationsResponse> =>
  new Promise((resolve, reject) => {
    notificationGrpcClient.GetNotifications(
      {
        user_id: userId,
        page: subscription.page,
        limit: subscription.limit,
        has_is_read: subscription.read !== undefined,
        is_read: subscription.read ?? false,
      },
      (error, response) => (error ? reject(error) : resolve(response)),
    );
  });

const getUnreadCount = (userId: string): Promise<GetUnreadNotificationCountResponse> =>
  new Promise((resolve, reject) => {
    notificationGrpcClient.GetUnreadNotificationCount(
      { user_id: userId },
      (error, response) => (error ? reject(error) : resolve(response)),
    );
  });

export class NotificationWebSocketGateway {
  private readonly clientsByUser = new Map<string, Set<WebSocket>>();

  constructor(server: HttpServer) {
    const webSocketServer = new WebSocketServer({
      server,
      path: NOTIFICATION_WEBSOCKET_PATH,
      maxPayload: 16 * 1024,
    });

    webSocketServer.on("connection", (socket) => this.registerConnection(socket));
  }

  broadcastCreated(notification: NotificationItem): void {
    this.broadcast(notification.user_id, "notification:created", { notification });
  }

  broadcastUpdated(userId: string, notification: NotificationItem): void {
    this.broadcast(userId, "notification:updated", { notification });
  }

  broadcastAllRead(userId: string, updatedCount: number): void {
    this.broadcast(userId, "notifications:all-read", { updatedCount });
  }

  broadcastDeleted(userId: string, notificationId: string): void {
    this.broadcast(userId, "notification:deleted", { notificationId });
  }

  private registerConnection(socket: WebSocket): void {
    const state: WebSocketConnectionState = {
      authenticating: false,
      authenticationTimeout: setTimeout(() => {
        sendError(socket, "Authentication timed out");
        socket.close(1008, "Authentication required");
      }, AUTHENTICATION_TIMEOUT_MS),
      subscription: { ...defaultSubscription },
    };

    socket.on("message", (data) => {
      void this.handleMessage(socket, state, data);
    });
    socket.on("close", () => {
      clearTimeout(state.authenticationTimeout);
      if (!state.userId) return;

      const clients = this.clientsByUser.get(state.userId);
      clients?.delete(socket);
      if (clients?.size === 0) this.clientsByUser.delete(state.userId);
    });
  }

  private async handleMessage(
    socket: WebSocket,
    state: WebSocketConnectionState,
    data: RawData,
  ): Promise<void> {
    const message = parseMessage(data);
    if (!message || typeof message.type !== "string") {
      sendError(socket, "Message must be a JSON object with a type");
      return;
    }

    if (!state.userId) {
      if (message.type !== "authenticate" || typeof message.token !== "string") {
        sendError(socket, "Authenticate before requesting notifications");
        return;
      }
      if (state.authenticating) return;

      state.authenticating = true;
      try {
        const user = await getAuthenticatedUserFromToken(
          normaliseToken(message.token),
        );
        if (!user) {
          sendError(socket, "Unauthorized");
          socket.close(1008, "Unauthorized");
          return;
        }

        state.userId = user.user_id;
        clearTimeout(state.authenticationTimeout);
        const clients = this.clientsByUser.get(state.userId) ?? new Set<WebSocket>();
        clients.add(socket);
        this.clientsByUser.set(state.userId, clients);
        send(socket, { type: "notification:authenticated" });
        await this.sendSnapshot(socket, state);
      } catch {
        sendError(socket, "Unauthorized");
        socket.close(1008, "Unauthorized");
      } finally {
        state.authenticating = false;
      }
      return;
    }

    if (message.type !== "notifications:subscribe") {
      sendError(socket, "Unsupported notification WebSocket message");
      return;
    }

    const page = getPositiveInteger(message.page, state.subscription.page, Number.MAX_SAFE_INTEGER);
    const limit = getPositiveInteger(message.limit, state.subscription.limit, 100);
    if (page === undefined || limit === undefined || (message.read !== undefined && typeof message.read !== "boolean")) {
      sendError(socket, "Invalid notification subscription");
      return;
    }

    state.subscription = {
      page,
      limit,
      read: message.read as boolean | undefined,
    };
    await this.sendSnapshot(socket, state);
  }

  private async sendSnapshot(
    socket: WebSocket,
    state: WebSocketConnectionState,
  ): Promise<void> {
    if (!state.userId) return;

    try {
      const [notifications, unreadCount] = await Promise.all([
        getNotifications(state.userId, state.subscription),
        getUnreadCount(state.userId),
      ]);
      send(socket, {
        type: "notifications:snapshot",
        data: {
          notifications: notifications.notifications,
          pagination: {
            total: notifications.total,
            page: notifications.page,
            limit: notifications.limit,
            totalPages: notifications.total_pages,
          },
          unreadCount: unreadCount.unread_count,
        },
      });
    } catch (error) {
      logger.error(`Unable to retrieve notification WebSocket snapshot: ${error}`);
      sendError(socket, "Unable to retrieve notifications");
    }
  }

  private broadcast(
    userId: string,
    type: string,
    data: Record<string, unknown>,
  ): void {
    for (const socket of this.clientsByUser.get(userId) ?? []) {
      send(socket, { type, data });
    }
  }
}
