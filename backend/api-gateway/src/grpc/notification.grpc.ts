import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { logger } from "@phoenix/common";
import path from "path";
import fs from "fs";

const distPath = path.resolve(
  process.cwd(),
  "dist/libs/proto/notification.proto",
);
const devPath = path.resolve(process.cwd(), "libs/proto/notification.proto");
const PROTO_PATH =
  process.env.NODE_ENV === "production" && fs.existsSync(distPath)
    ? distPath
    : devPath;
logger.info(`Loading gRPC proto file from: ${PROTO_PATH}`);
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(packageDefinition) as unknown as {
  notification: {
    NotificationService: new (
      address: string,
      credentials: grpc.ChannelCredentials,
    ) => NotificationServiceClient;
  };
};

export interface GetNotificationHealthRequest {}
export interface GetNotificationHealthResponse {
  status: number;
  message: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  event_id: string;
  event_type: string;
  title: string;
  message: string;
  metadata: string;
  is_read: boolean;
  read_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string;
}

export interface GetNotificationsRequest {
  user_id: string;
  page: number;
  limit: number;
  has_is_read: boolean;
  is_read: boolean;
}
export interface GetNotificationsResponse {
  status: number;
  message: string;
  notifications: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface GetUnreadNotificationCountRequest {
  user_id: string;
}
export interface GetUnreadNotificationCountResponse {
  status: number;
  message: string;
  unread_count: number;
}

export interface MarkNotificationAsReadRequest {
  notification_id: string;
  user_id: string;
}
export interface MarkNotificationAsReadResponse {
  status: number;
  message: string;
  notification?: NotificationItem;
}

export interface MarkAllNotificationsAsReadRequest {
  user_id: string;
}
export interface MarkAllNotificationsAsReadResponse {
  status: number;
  message: string;
  updated_count: number;
}

export interface DeleteNotificationRequest {
  notification_id: string;
  user_id: string;
}
export interface DeleteNotificationResponse {
  status: number;
  message: string;
}

export interface NotificationServiceClient {
  GetNotificationHealth(
    request: GetNotificationHealthRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetNotificationHealthResponse,
    ) => void,
  ): void;
  GetNotifications(
    request: GetNotificationsRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetNotificationsResponse,
    ) => void,
  ): void;
  GetUnreadNotificationCount(
    request: GetUnreadNotificationCountRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetUnreadNotificationCountResponse,
    ) => void,
  ): void;
  MarkNotificationAsRead(
    request: MarkNotificationAsReadRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: MarkNotificationAsReadResponse,
    ) => void,
  ): void;
  MarkAllNotificationsAsRead(
    request: MarkAllNotificationsAsReadRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: MarkAllNotificationsAsReadResponse,
    ) => void,
  ): void;
  DeleteNotification(
    request: DeleteNotificationRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: DeleteNotificationResponse,
    ) => void,
  ): void;
}

const notificationServiceUrl =
  process.env.NOTIFICATION_SERVICE_URL || "localhost:50052";
logger.info(
  `Connecting to Notification gRPC service at: ${notificationServiceUrl}`,
);
export const notificationGrpcClient =
  new grpcObject.notification.NotificationService(
    notificationServiceUrl,
    grpc.credentials.createInsecure(),
  );
