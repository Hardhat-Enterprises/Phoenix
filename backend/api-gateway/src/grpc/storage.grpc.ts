import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { logger } from "@phoenix/common";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const PROTO_PATH = path.resolve(`${process.env.STORAGE_PROTO_PATH}`);
logger.info(`Loading gRPC proto file from: ${PROTO_PATH}`);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(packageDefinition) as unknown as {
  storage: {
    StorageService: new (
      address: string,
      credentials: grpc.ChannelCredentials,
    ) => StorageServiceClient;
  };
};

export interface GetStorageHealthRequest {}

export interface GetStorageHealthResponse {
  status: number;
  message: string;
}

export interface StorageServiceClient {
  GetStorageHealth(
    request: GetStorageHealthRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetStorageHealthResponse,
    ) => void,
  ): void;
}

const userSericeUrl = process.env.STORAGE_SERVICE_URL || "localhost:50054";
export const storageGrpcClient = new grpcObject.storage.StorageService(
  userSericeUrl,
  grpc.credentials.createInsecure(),
);
