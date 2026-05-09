export interface RiskItem {
  integration_event_id: string;
  related_threat_id: string;
  correlation_score: string;
  linkage_reason: string;
  integration_confidence: string;
  linked_event_type: string;
  event_status: string;
  event_type: string;
}

export class GetRisksEntity {
  status: number;
  message: string;
  hazards: RiskItem[];
  total: number;
  page: number;
  limit: number;

  static toEntity(items: any[]): RiskItem[] {
    return items.map((r) => ({
      integration_event_id: r.integration_event_id ?? "",
      related_threat_id: r.related_threat_id ?? "",
      correlation_score: r.correlation_score ?? "",
      linkage_reason: r.linkage_Reason ?? "",
      linked_event_type: r.linked_Event_type ?? "",
      event_status: r.event_status ?? "",
      event_type: r.event_type ?? "",
      created_at: r.created_at ? new Date(r.created_at).toISOString() : "",
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : "",
    }));
  }
}

export class GetRiskEntity {
  status: number;
  message: string;
  hazard?: RiskItem;
}
