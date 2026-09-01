import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import fs from "fs";
import path from "path";

interface User {
  user_id: string;
}

interface GetUsersResponse {
  status: number;
  message: string;
  users: User[];
}

interface UserServiceClient {
  GetUsers(
    request: Record<string, never>,
    callback: (error: grpc.ServiceError | null, response: GetUsersResponse) => void,
  ): void;
}

const distPath = path.resolve(process.cwd(), "dist/libs/proto/user.proto");
const devPath = path.resolve(process.cwd(), "libs/proto/user.proto");
const protoPath =
  process.env.NODE_ENV === "production" && fs.existsSync(distPath)
    ? distPath
    : devPath;
const definition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const grpcObject = grpc.loadPackageDefinition(definition) as unknown as {
  user: {
    UserService: new (
      address: string,
      credentials: grpc.ChannelCredentials,
    ) => UserServiceClient;
  };
};

const userServiceUrl = process.env.USER_SERVICE_URL || "localhost:50051";
const userGrpcClient = new grpcObject.user.UserService(
  userServiceUrl,
  grpc.credentials.createInsecure(),
);

export const getNotificationRecipientIds = async (): Promise<string[]> =>
  new Promise((resolve, reject) => {
    userGrpcClient.GetUsers({}, (error, response) => {
      if (error) return reject(error);
      if (response.status !== 200) return reject(new Error(response.message));
      return resolve([
        ...new Set(response.users.map((user) => user.user_id).filter(Boolean)),
      ]);
    });
  });
