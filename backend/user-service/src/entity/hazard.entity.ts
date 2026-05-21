export interface HazardItem {
  hazard_event_id: string;
  url: string;
  text: string;
  timestamp: Date;
  hazard_type: string;
  hazard_severity: number;
  hazard_timestamp: Date;
  hazard_location: string;
  hazard_status: string;
  alert_level: string;
  source: string;
  created_at: Date;
  updated_at: Date;
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
      url: h.url ?? "",
      text: h.text ?? "",
      timestamp: h.timestamp ? new Date(h.timestamp) : new Date(),
      hazard_type: h.hazard_type ?? "",
      hazard_severity: h.hazard_severity ?? 0,
      hazard_timestamp: h.hazard_timestamp
        ? new Date(h.hazard_timestamp)
        : new Date(),
      hazard_location: h.hazard_location ?? "",
      source: h.source ?? "",
      hazard_status: h.hazard_status ?? "",
      alert_level: h.alert_level ?? "",
      created_at: h.created_at ? new Date(h.created_at) : new Date(),
      updated_at: h.updated_at ? new Date(h.updated_at) : new Date(),
    }));
  }
}

export class GetHazardEntity {
  status: number;
  message: string;
  hazard?: HazardItem;
}
