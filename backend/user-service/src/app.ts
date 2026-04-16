import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import dotenv from "dotenv";
import { userHandler } from "./grpc/user.handler";
import { config, initDatabase } from "@phoenix/common";

dotenv.config();

const PROTO_PATH = path.resolve(process.cwd(), "libs/proto/user.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(packageDefinition) as any;
const userPackage = grpcObject.user;

const startGrpcServer = async (): Promise<void> => {
  try {
    await initDatabase();

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
      }
    );
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }
};

startGrpcServer();