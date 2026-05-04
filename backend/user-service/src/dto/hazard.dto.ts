export class GetHazardsDto {
  hazard_type?: string;
  severity_level?: string;
  event_status?: string;
  page?: number;
  limit?: number;
}

export class GetHazardDto {
  hazard_event_id: string;
}
