export interface HazardDataStreamRequest {
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

export interface CyberDataStreamRequest {
  event_id: string;
  timestamp: string;
  event_type: string;
  source: string;
  threat_type: string;
  severity: string;
  confidence_score: number;
  details: string;
}
