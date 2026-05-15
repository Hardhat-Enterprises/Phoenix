import { IntegrationType, IntegrationStatus } from "@phoenix/common";

export interface IntegrationItem {
  integration_event_id: string;
  integration_type: IntegrationType;
  input: string;
  output: string;
  status: IntegrationStatus;
  note: string;
  created_at: Date;
  updated_at: Date;
}

export class GetIntegrationsEntity {
  status: number;
  message: string;
  integrations: IntegrationItem[];
  total: number;
  page: number;
  limit: number;

  static toEntity(items: any[]): IntegrationItem[] {
    return items.map((r) => ({
      integration_event_id: r.integration_event_id ?? "",
      integration_type: r.integration_type ?? "",
      input: r.input ?? 0,
      output: r.output ?? "",
      status: r.status ?? 0,
      note: r.note ?? "",
      created_at: r.created_at ? new Date(r.created_at) : new Date(),
      updated_at: r.updated_at ? new Date(r.updated_at) : new Date(),
    }));
  }
}

export class GetIntegrationEntity {
  status: number;
  message: string;
  hazard?: IntegrationItem;
}
