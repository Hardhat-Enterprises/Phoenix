import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import dotenv from "dotenv";
import { notificationHandler } from "./grpc/notification.handler";
import { config } from "@phoenix/common";

dotenv.config();

//const PROTO_PATH = path.resolve(process.cwd(), "libs/proto/notification.proto");
const PROTO_PATH = path.resolve(`${process.env.NOTIFICATION_PROTO_PATH}`);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(packageDefinition) as any;
const notificationPackage = grpcObject.notification;

const startGrpcServer = () => {
  const server = new grpc.Server();

  server.addService(notificationPackage.NotificationService.service, notificationHandler);

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
};

startGrpcServer();
