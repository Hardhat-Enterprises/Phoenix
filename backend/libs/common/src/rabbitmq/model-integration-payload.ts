export interface CoreModelIntegrationPayload {
  url: string;
  text: string;
  timestamp: string;
  hazard_type: string;
  hazard_severity: number;
  hazard_timestamp: string;
  hazard_location: string;
  hazard_status: string;
  alert_level: string;
  source: string;
}

export interface CoreModelIntegrationEnvelope {
  integration_event_id: string;
  payload: CoreModelIntegrationPayload;
  requested_at: string;
  requested_by: string;
}
