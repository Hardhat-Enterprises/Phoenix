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
