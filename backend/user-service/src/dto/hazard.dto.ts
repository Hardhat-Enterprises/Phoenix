export class GetHazardsDto {
  hazard_type?: string;
  hazard_severity?: string;
  hazard_status?: string;
  page?: number;
  limit?: number;
}

export class GetHazardDto {
  hazard_event_id: string;
}
