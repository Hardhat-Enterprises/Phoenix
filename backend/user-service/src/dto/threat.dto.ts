export class GetThreatsDto {
  threat_type?: string;
  risk_level?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class GetThreatDto {
  threat_id: string;
}
