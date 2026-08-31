export interface ThreatItem {
  threat_id: string;
  event_id: string;
  timestamp: string;
  event_type: string;
  source: string;
  threat_type: string;
  severity: string;
  confidence_score: number;
  details: string;
  created_at?: Date;
  updated_at?: Date;
}

export class GetThreatsEntity {
  status: number;
  message: string;
  threats: ThreatItem[];
  total: number;
  page: number;
  limit: number;

  static toEntity(items: any[]): ThreatItem[] {
    return items.map((t) => ({
      threat_id: String(t.threat_id ?? ""),
      event_id: t.event_id ?? "",
      timestamp: t.timestamp ?? "",
      event_type: t.event_type ?? "",
      source: t.source ?? "",
      threat_type: t.threat_type ?? "",
      severity: t.severity ?? "",
      confidence_score: t.confidence_score != null ? t.confidence_score : 0,
      details: t.details ? t.details : "",
      created_at: t.created_at ? new Date(t.created_at) : new Date(),
      updated_at: t.updated_at ? new Date(t.updated_at) : new Date(),
    }));
  }
}

export class GetThreatEntity {
  status: number;
  message: string;
  threat?: ThreatItem;
}
