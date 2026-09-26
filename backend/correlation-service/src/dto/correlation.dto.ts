export interface CorrelationRequest {
  text?: string;
  url?: string;
  observed_time?: string;
  state?: string;
}

export interface CorrelationLocation {
  suburb?: string | null;
  state?: string | null;
}

export interface CorrelationHazard {
  hazard_id: string;
  hazard_type?: string | null;
  location?: CorrelationLocation | null;
  status?: string | null;
  severity?: string | null;
  start_time?: string | null;
}

export type CorrelationStatus =
  | "ok"
  | "no_hazards_available"
  | "invalid_input";

export type RelationshipType =
  | "fake_relief_or_donation"
  | "impersonates_response_agency"
  | "fake_emergency_update"
  | "exploits_hazard"
  | "mentions_hazard"
  | "unrelated";

export interface CorrelationEvidence {
  checks_fired: string[];
  details?: Record<string, unknown>;
}

export interface CorrelationResponse {
  is_hazard_related: boolean;
  correlation_probability: number;
  relationship_type: RelationshipType;
  hazard: CorrelationHazard | null;
  match_count: number;
  other_matches?: CorrelationHazard[];
  status: CorrelationStatus;
  status_detail: string | null;
  model_version: string;
  evaluated_at: string;
  hazards_checked: number;
  evidence: CorrelationEvidence;
}

export interface CorrelationHealthResponse {
  status: "ok";
  model_version: string;
  threshold: number;
  checks_enabled: string[];
  hazard_source: string;
  hazard_source_available: boolean;
}