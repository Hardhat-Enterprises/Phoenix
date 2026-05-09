export class GetRisksDto {
  hazard_id?: string;
  threat_id?: string;
  event_status?: string;
  page?: number;
  limit?: number;
}

export class GetRiskDto {
  integration_event_id: string;
}
