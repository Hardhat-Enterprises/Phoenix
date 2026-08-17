export class GetThreatsDto {
  threat_type?: string;
  severity?: string;
  page?: number;
  limit?: number;
}

export class GetThreatDto {
  threat_id: string;
}
