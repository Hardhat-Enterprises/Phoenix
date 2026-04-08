import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { logger } from "@phoenix/common";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

const PROTO_PATH = path.resolve(`${process.env.USER_PROTO_PATH}`);
logger.info(`Loading gRPC proto file from: ${PROTO_PATH}`);
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(packageDefinition) as unknown as {
  user: {
    UserService: new (
      address: string,
      credentials: grpc.ChannelCredentials,
    ) => UserServiceClient;
  };
};

export interface GetUserHealthRequest {}
export interface GetUserHealthResponse {
  status: number;
  message: string;
}

export interface GetUsersRequest {}
export interface GetUsersResponse {
  status: number;
  message: string;
  users: [
    {
      id: string;
      name: string;
      email: string;
    },
  ];
}

export interface UserServiceClient {
  GetUserHealth(
    request: GetUserHealthRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetUserHealthResponse,
    ) => void,
  ): void;
  GetUsers(
    request: GetUsersRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetUsersResponse,
    ) => void,
  ): void;
}

const userServiceUrl = process.env.USER_SERVICE_URL || "localhost:50051";

export const userGrpcClient = new grpcObject.user.UserService(
  userServiceUrl,
  grpc.credentials.createInsecure(),
);
