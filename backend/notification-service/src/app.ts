import path from "path";
import fs from "fs";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import dotenv from "dotenv";
import { notificationHandler } from "./grpc/notification.handler";
import { config, initDatabase } from "@phoenix/common";
import { logger } from "@phoenix/common";
import { connectNotificationRabbitMQ } from "./rabbitmq/notification-connection";
import { startNotificationConsumer } from "./rabbitmq/notification-consumer";
import { processNotificationEvent } from "./services/notification.service";

dotenv.config();

const distProtoPath = path.resolve(
  process.cwd(),
  "dist/libs/proto/notification.proto",
);
const devProtoPath = path.resolve(process.cwd(), "libs/proto/notification.proto");
const PROTO_PATH =
  process.env.NODE_ENV === "production" && fs.existsSync(distProtoPath)
    ? distProtoPath
    : devProtoPath;

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(packageDefinition) as any;
const notificationPackage = grpcObject.notification;

const startGrpcServer = (): grpc.Server => {
  const server = new grpc.Server();

  server.addService(
    notificationPackage.NotificationService.service,
    notificationHandler,
  );

  server.bindAsync(
    `0.0.0.0:${config.NOTIFICATION_SERVICE_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (error, boundPort) => {
      if (error) {
        console.error("Failed to start notification-service:", error);
        return;
      }

      console.log(`Notification service gRPC running on port ${boundPort}`);
    },
  );

  return server;
};

const startNotificationService = async (): Promise<void> => {
  try {
    const rabbitMQUrl = process.env.RABBITMQ_URL;
    if (!rabbitMQUrl) {
      throw new Error("RABBITMQ_URL is required");
    }

    await initDatabase();
    const { channel } = await connectNotificationRabbitMQ(rabbitMQUrl);
    await startNotificationConsumer(channel, processNotificationEvent);
    startGrpcServer();
  } catch (error) {
    logger.error(`Notification service startup failed: ${error}`);
    process.exitCode = 1;
  }
};

void startNotificationService();
