import { IntegrationStatus, IntegrationType } from "@phoenix/common";

export interface RiskAssessmentItem {
  risk_assessment_id: string;
  source_integration_id: string;
  integration_type: IntegrationType;
  risk_score: number;
  confidence_score: number;
  predicted_class: number;
  risk_level: string;
  input: string;
  teavs_alert: string;
  status: IntegrationStatus;
  note: string;
  created_at: Date;
  updated_at: Date;
}

const parseObject = (value: unknown): Record<string, any> => {
  if (value && typeof value === "object") return value as Record<string, any>;
  if (typeof value !== "string" || !value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export class GetRiskAssessmentsEntity {
  status: number;
  message: string;
  risk_assessments: RiskAssessmentItem[];
  total: number;
  page: number;
  limit: number;

  static toEntity(items: any[]): RiskAssessmentItem[] {
    return items.map((item) => {
      const input = parseObject(item.input);
      const output = parseObject(item.output);

      return {
        risk_assessment_id: item.integration_event_id ?? "",
        source_integration_id: item.integration_event_id ?? "",
        integration_type: item.integration_type ?? IntegrationType.CORE,
        risk_score: Number(output.risk_score ?? 0),
        confidence_score: Number(output.confidence_score ?? 0),
        predicted_class: Number(output.predicted_class ?? 0),
        risk_level: String(output.risk_level ?? "").toLowerCase(),
        input: JSON.stringify(input),
        teavs_alert: JSON.stringify(output.teavs_alert ?? {}),
        status: item.status ?? IntegrationStatus.ERROR,
        note: item.note ?? "",
        created_at: item.created_at ? new Date(item.created_at) : new Date(),
        updated_at: item.updated_at ? new Date(item.updated_at) : new Date(),
      };
    });
  }
}

export class GetRiskAssessmentEntity {
  status: number;
  message: string;
  risk_assessment?: RiskAssessmentItem;
}
