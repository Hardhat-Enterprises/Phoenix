export interface ThreatPayload {
  cyber_threat?: string;
  severity?: string;
  confidence?: number;
  recommended_action?: string;
  source?: string;
  risk_score?: number;
}
export interface ThreatValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
const VALID_SEVERITIES = ["low", "medium", "high", "critical"];

export const validateThreatPayload = (
  payload: ThreatPayload,
): ThreatValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required threat-analysis fields
  if (!payload.cyber_threat?.trim()) {
    errors.push("cyber_threat is required");
  }

  if (!payload.severity?.trim()) {
    errors.push("severity is required");
  } else if (!VALID_SEVERITIES.includes(payload.severity.toLowerCase())) {
    errors.push(
      `severity must be one of: ${VALID_SEVERITIES.join(", ")}`,
    );
    }

  // Threat-analysis scores must use the existing 0-1 contract
  if (payload.confidence === undefined) {
    errors.push("confidence is required");
  } else if (
    typeof payload.confidence !== "number" ||
    payload.confidence < 0 ||
    payload.confidence > 1
  ) {
    errors.push("confidence must be a number between 0 and 1");
  }

  if (payload.risk_score === undefined) {
    errors.push("risk_score is required");
  } else if (
    typeof payload.risk_score !== "number" ||
    payload.risk_score < 0 ||
    payload.risk_score > 1
  ) {
    errors.push("risk_score must be a number between 0 and 1");
  }

  // Recommended action is useful downstream but should not reject the event
  if (!payload.recommended_action?.trim()) {
    warnings.push("recommended_action is missing");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};
    
