import { DataStreamEventType } from "@phoenix/common";

export interface LocationPayload {
  state_region: string;
  local_government_area: string;
  suburb: string;
}

export interface DataStreamPayload {
  event_type: DataStreamEventType;
  risk_score: number;
  severity: string;
  confidence: number;
  hazard_type: string;
  cyber_threat: string;
  recommended_action: string;
  top_risk_factors: string[];
  timestamp: string;
  model_version: string;
}

export interface DataStreamRequest {
  event_id: string;
  timestamp: string;
  event_type: DataStreamEventType;
  source: string;
  location: LocationPayload;
  payload: DataStreamPayload;
}
