export interface ThreatItem {
  threat_id: string;
  threat_type: string;
  title: string;
  description: string;
  risk_level: string;
  status: string;
  category: string;
  confidence_score: string;
  detected_at: string;
  created_at: string;
  updated_at: string;
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
      threat_type: t.threat_type ?? "",
      title: t.title ?? "",
      description: t.description ?? "",
      risk_level: t.risk_level ?? "",
      status: t.status ?? "",
      category: t.category ?? "",
      confidence_score: t.confidence_score != null ? String(t.confidence_score) : "",
      detected_at: t.detected_at ? new Date(t.detected_at).toISOString() : "",
      created_at: t.created_at ? new Date(t.created_at).toISOString() : "",
      updated_at: t.updated_at ? new Date(t.updated_at).toISOString() : "",
    }));
  }
}

export class GetThreatEntity {
  status: number;
  message: string;
  threat?: ThreatItem;
}
