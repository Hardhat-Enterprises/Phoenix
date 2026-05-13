export class GetRisksDto {
  hazard_id?: string;
  threat_id?: string;
  event_status?: string;
  page?: number;
  limit?: number;
  linked_event_type?: string;
}

export class GetRiskDto {
  integration_event_id: string;
}
