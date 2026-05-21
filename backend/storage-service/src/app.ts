import * as path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as dotenv from "dotenv";
import { config, initDatabase } from "@phoenix/common";
import { storageHandler } from "./grpc/storage.handler";

dotenv.config();

const PROTO_PATH = path.resolve(
  process.env.STORAGE_PROTO_PATH || "libs/proto/storage.proto",
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(packageDefinition) as any;
const storagePackage = grpcObject.storage;

const startGrpcServer = async (): Promise<void> => {
  try {
    await initDatabase();

    const server = new grpc.Server();

    server.addService(storagePackage.StorageService.service, {
      ...storageHandler,
    });

    server.bindAsync(
      `0.0.0.0:${config.STORAGE_SERVICE_PORT}`,
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => {
        if (error) {
          console.error("Failed to start storage-service:", error);
          return;
        }

        console.log(`Storage service gRPC running on port ${boundPort}`);
      },
    );
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }
};

startGrpcServer();
