import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { IntegrationStatus, IntegrationType, logger } from "@phoenix/common";
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
// ─── Client interface ──────────────────────────────────────────────────────

export interface GetUserHealthRequest {}

export interface GetUserHealthResponse {
  status: number;
  message: string;
}

export interface GetUsersRequest {}

export interface GetUsersResponse {
  status: number;
  message: string;
  users: {
    user_id: string;
    username: string;
    role: string;
  }[];
}

export interface RegisterUserRequest {
  username: string;
  password: string;
  role?: string;
}

export interface LoginUserRequest {
  username: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface LogoutUserRequest {
  user_id: string;
}

export interface AuthResponse {
  status: number;
  message: string;
  user_id?: string;
  username?: string;
  role?: string;
  access_token?: string;
  refresh_token?: string;
}

export interface GetUserDashboardRequest {}

export interface GetUserDashboardResponse {
  status: number;
  message: string;
  total_hazards: number;
  critical_hazards: number;
  total_threats: number;
  active_threats: number;
  total_ingestions: number;
  last_updated: string;
}

export interface GetUserDashboardChartsRequest {}

export interface GetUserDashboardChartsResponse {
  status: number;
  message: string;
  hazards_by_severity: string;
  threats_by_risk_level: string;
  last_updated: string;
}

export interface GetUserDashboardActivityRequest {}

export interface GetUserDashboardActivityResponse {
  status: number;
  message: string;
  recent_hazards: string;
  recent_threats: string;
  last_updated: string;
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
  url: string;
  text: string;
  timestamp: Date;
  hazard_type: string;
  hazard_severity: number;
  hazard_timestamp: Date;
  hazard_location: string;
  hazard_status: string;
  alert_level: string;
  source: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface GetHazardsRequest {
  hazard_type?: string;
  hazard_severity?: string;
  hazard_status?: string;
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

export interface GetLocationsRequest {}

export interface GetLocationsResponse {
  status: number;
  message: string;
  locations: LocationItem[];
}

export interface LocationItem {
  geo_location_id: string;
  country: string;
  state_region: string;
  local_government_area: string;
  suburb: string;
  latitude: number;
  longitude: number;
  geo_precision: string;
}

export interface GetEventStatusesRequest {}

export interface GetEventStatusesResponse {
  status: number;
  message: string;
  eventStatuses: EventStatusItem[];
}

export interface EventStatusItem {
  event_status_id: string;
  event_status_description: string;
}

export interface GetLinkedEventTypesRequest {}

export interface GetLinkedEventTypesResponse {
  status: number;
  message: string;
  linkedEventTypes: LinkedEventTypeItem[];
}

export interface LinkedEventTypeItem {
  linked_event_type_id: string;
  linked_event_type_description: string;
}

export interface GetSeasonsRequest {}

export interface GetSeasonsResponse {
  status: number;
  message: string;
  seasons: SeasonItem[];
}

export interface SeasonItem {
  season_id: string;
  season_description: string;
}

export interface GetReferenceDaysRequest {}

export interface GetReferenceDaysResponse {
  status: number;
  message: string;
  referenceDays: ReferenceDayItem[];
}

export interface ReferenceDayItem {
  reference_day_id: string;
  reference_day_description: string;
}

export interface ReferenceTimesRequest {}

export interface ReferenceTimesResponse {
  status: number;
  message: string;
  referenceTimes: ReferenceTimeItem[];
}

export interface ReferenceTimeItem {
  ref_time: string;
  is_nighttime: boolean;
  is_business_hours: boolean;
}

export interface GetIntegrationsRequest {
  from: string;
  to: string;
  page: number;
  limit: number;
}

export interface GetIntegrationsResponse {
  status: number;
  message: string;
  integrations: IntegrationItem[];
  total: number;
  page: number;
  limit: number;
}

export interface IntegrationItem {
  integration_event_id: string;
  integration_type: IntegrationType;
  input: string;
  output: string;
  status: IntegrationStatus;
  note: string;
  created_at: Date;
  updated_at: Date;
}

export interface GetIntegrationRequest {
  integration_event_id: string;
}

export interface GetIntegrationResponse {
  status: number;
  message: string;
  risk?: IntegrationItem;
}

export interface GetTrainingModelsRequest {}

export interface GetTrainingModelsResponse {
  status: number;
  message: string;
  models?: TrainingModelItem[];
}

export interface TrainingModelItem {
  file_id: string;
  original_name: string;
  mime_type: string;
}

export interface GetOneTrainingModelRequest {
  file_id: string;
}

export interface GetOneTrainingModelResponse {
  status: number;
  message: string;
  model?: TrainingModelItem[];
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

  RegisterUser(
    request: RegisterUserRequest,
    callback: (error: grpc.ServiceError | null, response: AuthResponse) => void,
  ): void;

  LoginUser(
    request: LoginUserRequest,
    callback: (error: grpc.ServiceError | null, response: AuthResponse) => void,
  ): void;

  RefreshToken(
    request: RefreshTokenRequest,
    callback: (error: grpc.ServiceError | null, response: AuthResponse) => void,
  ): void;

  LogoutUser(
    request: LogoutUserRequest,
    callback: (error: grpc.ServiceError | null, response: AuthResponse) => void,
  ): void;

  GetUserDashboard(
    request: GetUserDashboardRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetUserDashboardResponse,
    ) => void,
  ): void;

  GetUserDashboardCharts(
    request: GetUserDashboardChartsRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetUserDashboardChartsResponse,
    ) => void,
  ): void;

  GetUserDashboardActivity(
    request: GetUserDashboardActivityRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetUserDashboardActivityResponse,
    ) => void,
  ): void;

  GetThreats(
    request: GetThreatsRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetThreatsResponse,
    ) => void,
  ): void;

  GetThreat(
    request: GetThreatRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetThreatResponse,
    ) => void,
  ): void;

  GetHazards(
    request: GetHazardsRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetHazardsResponse,
    ) => void,
  ): void;

  GetHazard(
    request: GetHazardRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetHazardResponse,
    ) => void,
  ): void;

  GetLocations(
    request: GetLocationsRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetLocationsResponse,
    ) => void,
  ): void;

  GetEventStatuses(
    request: GetEventStatusesRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetEventStatusesResponse,
    ) => void,
  ): void;

  GetLinkedEventTypes(
    request: GetLinkedEventTypesRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetLinkedEventTypesResponse,
    ) => void,
  ): void;

  GetSeasons(
    request: GetSeasonsRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetSeasonsResponse,
    ) => void,
  ): void;

  GetReferenceDays(
    request: GetReferenceDaysRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetReferenceDaysResponse,
    ) => void,
  ): void;

  GetReferenceTimes(
    request: ReferenceTimesRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: ReferenceTimesResponse,
    ) => void,
  ): void;

  GetIntegrations(
    request: GetIntegrationsRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetIntegrationsResponse,
    ) => void,
  ): void;

  GetIntegration(
    request: GetIntegrationRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetIntegrationResponse,
    ) => void,
  ): void;

  GetTrainingModels(
    request: GetTrainingModelsRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetTrainingModelsResponse,
    ) => void,
  ): void;
  GetOneTrainingModel(
    request: GetOneTrainingModelRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: GetOneTrainingModelResponse,
    ) => void,
  ): void;
}

const userServiceUrl = process.env.USER_SERVICE_URL || "localhost:50051";

export const userGrpcClient = new grpcObject.user.UserService(
  userServiceUrl,
  grpc.credentials.createInsecure(),
);
