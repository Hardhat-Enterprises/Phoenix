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
  users: [{ user_id: string; username: string; role: string }];
}

// ─── Threats ───────────────────────────────────────────────────────────────

export interface ThreatItem {
  threat_id: string;
  threat_type: string;
  title: string;
  description: string;
  risk_level: string;
  status: string;
  category: string;
  confidence_score: string;
  detected_at: string;
  created_at: string;
  updated_at: string;
}

export interface GetThreatsRequest {
  threat_type?: string;
  risk_level?: string;
  status?: string;
  page?: number;
  limit?: number;
}
export interface GetThreatsResponse {
  status: number;
  message: string;
  threats: ThreatItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GetThreatRequest {
  threat_id: string;
}
export interface GetThreatResponse {
  status: number;
  message: string;
  threat?: ThreatItem;
}

// ─── Hazards ───────────────────────────────────────────────────────────────

export interface HazardItem {
  hazard_event_id: string;
  hazard_type: string;
  severity_level: string;
  event_status: string;
  start_time: string;
  end_time: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface GetHazardsRequest {
  hazard_type?: string;
  severity_level?: string;
  event_status?: string;
  page?: number;
  limit?: number;
}
export interface GetHazardsResponse {
  status: number;
  message: string;
  hazards: HazardItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GetHazardRequest {
  hazard_event_id: string;
}
export interface GetHazardResponse {
  status: number;
  message: string;
  hazard?: HazardItem;
}

// ─── Client interface ──────────────────────────────────────────────────────

export interface UserServiceClient {
  GetUserHealth(
    request: GetUserHealthRequest,
    callback: (error: grpc.ServiceError | null, response: GetUserHealthResponse) => void,
  ): void;
  GetUsers(
    request: GetUsersRequest,
    callback: (error: grpc.ServiceError | null, response: GetUsersResponse) => void,
  ): void;
  GetThreats(
    request: GetThreatsRequest,
    callback: (error: grpc.ServiceError | null, response: GetThreatsResponse) => void,
  ): void;
  GetThreat(
    request: GetThreatRequest,
    callback: (error: grpc.ServiceError | null, response: GetThreatResponse) => void,
  ): void;
  GetHazards(
    request: GetHazardsRequest,
    callback: (error: grpc.ServiceError | null, response: GetHazardsResponse) => void,
  ): void;
  GetHazard(
    request: GetHazardRequest,
    callback: (error: grpc.ServiceError | null, response: GetHazardResponse) => void,
  ): void;
}

const userServiceUrl = process.env.USER_SERVICE_URL || "localhost:50051";

export const userGrpcClient = new grpcObject.user.UserService(
  userServiceUrl,
  grpc.credentials.createInsecure(),
);
