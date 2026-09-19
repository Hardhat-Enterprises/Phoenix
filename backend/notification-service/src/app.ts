import path from "path";

import * as grpc from "@grpc/grpc-js";

import * as protoLoader from "@grpc/proto-loader";

import dotenv from "dotenv";

import { notificationHandler } from "./grpc/notification.handler";

import { config, logger } from "@phoenix/common";

dotenv.config();

const PROTO_PATH = path.resolve(
  `${process.env.NOTIFICATION_PROTO_PATH}`,
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(
  packageDefinition,
) as any;

const notificationPackage = grpcObject.notification;

const server = new grpc.Server();

server.addService(
  notificationPackage.NotificationService.service,
  notificationHandler,
);

const startGrpcServer = () => {
  server.bindAsync(
    `0.0.0.0:${config.NOTIFICATION_SERVICE_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (error, boundPort) => {
      if (error) {
        logger.error(
          `Failed to start notification-service: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );

        return;
      }

      logger.info(
        `Notification service gRPC running on port ${boundPort}`,
      );
    },
  );
};

const shutdown = (signal: string) => {
  logger.info(
    `Notification service shutting down due to ${signal}`,
  );

  server.tryShutdown((error) => {
    if (error) {
      logger.error(
        `Notification service graceful shutdown failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      server.forceShutdown();
      return;
    }

    logger.info("Notification service shut down successfully");
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));

process.on("SIGTERM", () => shutdown("SIGTERM"));

startGrpcServer();