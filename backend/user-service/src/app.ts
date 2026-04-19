import * as path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as dotenv from "dotenv";
import { userHandler } from "./grpc/user.handler";
import { config } from "@phoenix/common";

dotenv.config();

const PROTO_PATH = path.resolve(`${process.env.USER_PROTO_PATH}`);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(packageDefinition) as any;
const userPackage = grpcObject.user;

const startGrpcServer = () => {
  const server = new grpc.Server();

  server.addService(userPackage.UserService.service, userHandler);

  server.bindAsync(
    `0.0.0.0:${config.USER_SERVICE_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (error, boundPort) => {
      if (error) {
        console.error("Failed to start user-service:", error);
        return;
      }

      console.log(`User service gRPC running on port ${boundPort}`);
    },
  );
};

startGrpcServer();
