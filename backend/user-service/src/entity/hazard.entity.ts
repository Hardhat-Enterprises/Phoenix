export interface HazardItem {
  hazard_event_id: string;
  hazard_type: string;
  severity_level: string;
  event_status: string;
  start_time: string;
  end_time: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export class GetHazardsEntity {
  status: number;
  message: string;
  hazards: HazardItem[];
  total: number;
  page: number;
  limit: number;

  static toEntity(items: any[]): HazardItem[] {
    return items.map((h) => ({
      hazard_event_id: h.hazard_event_id ?? "",
      hazard_type: h.hazard_type ?? "",
      severity_level: h.severity_level ?? "",
      event_status: h.event_status ?? "",
      start_time: h.start_time ? new Date(h.start_time).toISOString() : "",
      end_time: h.end_time ? new Date(h.end_time).toISOString() : "",
      description: h.description ?? "",
      created_at: h.created_at ? new Date(h.created_at).toISOString() : "",
      updated_at: h.updated_at ? new Date(h.updated_at).toISOString() : "",
    }));
  }
}

export class GetHazardEntity {
  status: number;
  message: string;
  hazard?: HazardItem;
}
