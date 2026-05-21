import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { logger } from "@phoenix/common";
import path from "path";
import fs from "fs";

const distPath = path.resolve(process.cwd(), "dist/libs/proto/notification.proto");
const devPath = path.resolve(process.cwd(), "libs/proto/notification.proto");
const PROTO_PATH = fs.existsSync(distPath) ? distPath : devPath;
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

export interface GetNotificationsRequest {}
export interface GetNotificationsResponse {
  status: number;
  message: string;
  notifications: [
    {
      id: string;
      title: string;
      body: string;
      recipient: string;
    },
  ];
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
}

const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || "localhost:50052";

export const notificationGrpcClient = new grpcObject.notification.NotificationService(
  notificationServiceUrl,
  grpc.credentials.createInsecure(),
);
