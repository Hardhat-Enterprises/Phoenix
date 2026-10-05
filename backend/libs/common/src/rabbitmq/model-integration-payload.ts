export interface CoreModelInputData {
  url?: string | null;
  text?: string | null;
  timestamp?: string;
  hazard_type?: string;
  hazard_timestamp?: string;
  hazard_location?: string;
  hazard_status?: string;
  source?: string;
}

/** Internal RabbitMQ envelope for an accepted core-model request. */
export interface CoreModelIntegrationPayload {
  integration_event_id: string;
  input_data: CoreModelInputData;
  accepted_at: string;
}
