import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

//const PROTO_PATH = path.resolve(process.cwd(), "libs/proto/ingestion.proto");
import fs from "fs";
import { logger } from "@phoenix/common";

const distPath = path.resolve(process.cwd(), "dist/libs/proto/ingestion.proto");
const devPath = path.resolve(process.cwd(), "libs/proto/ingestion.proto");
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
  ingestion: {
    IngestionService: new (
      address: string,
      credentials: grpc.ChannelCredentials,
    ) => UserServiceClient;
  };
};

export interface GetIngestionHealthRequest {}
export interface GetIngestionHealthResponse {
  status: number;
  message: string;
}

export interface UserServiceClient {
  GetIngestionHealth(
    request: GetIngestionHealthRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetIngestionHealthResponse,
    ) => void,
  ): void;
}

export const ingestionGrpcClient = new grpcObject.ingestion.IngestionService(
  process.env.INGESTION_SERVICE_URL || "localhost:50053",
  grpc.credentials.createInsecure(),
);
