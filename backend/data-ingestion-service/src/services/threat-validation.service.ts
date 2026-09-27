export interface ThreatPayload {
  cyber_threat?: string;
  severity?: string;
  confidence?: number;
  recommended_action?: string;
  source?: string;
  risk_score?: number;
  details?: unknown;
}

export interface ThreatValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface NormalisedThreatPayload extends ThreatPayload {
  cyber_threat: string;
  severity: ThreatSeverity;
  source: string;
}
const VALID_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type ThreatSeverity = (typeof VALID_SEVERITIES)[number];
/**
 * Validates incoming threat-analysis payloads before they enter
 * the cyber threat ingestion pipeline.
 */
export const validateThreatPayload = (
  payload: ThreatPayload,
): ThreatValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Payload must exist
  if (!payload || typeof payload !== "object") {
    return {
      valid: false,
      errors: ["payload must be a valid object"],
      warnings: [],
    };
  }

  // Cyber threat is required
  if (!payload.cyber_threat?.trim()) {
    errors.push("cyber_threat is required");
  }

 // Severity validation
if (!payload.severity?.trim()) {
  errors.push("severity is required");
} else {
  const severity = payload.severity.trim().toLowerCase();

  if (!VALID_SEVERITIES.includes(severity as ThreatSeverity)) {
    errors.push(
      `severity must be one of: ${VALID_SEVERITIES.join(", ")}`,
    );
  }
}

  // Confidence must follow the 0-1 contract
  if (payload.confidence === undefined) {
    errors.push("confidence is required");
  } else if (
    !Number.isFinite(payload.confidence) ||
    payload.confidence < 0 ||
    payload.confidence > 1
  ) {
    errors.push("confidence must be a number between 0 and 1");
  }

  // Risk score must follow the 0-1 contract
  if (payload.risk_score === undefined) {
    errors.push("risk_score is required");
  } else if (
    !Number.isFinite(payload.risk_score) ||
    payload.risk_score < 0 ||
    payload.risk_score > 1
  ) {
    errors.push("risk_score must be a number between 0 and 1");
  }

  // Source is required by the ingestion service
  if (!payload.source?.trim()) {
    errors.push("source is required");
  }

  // Recommended action is useful downstream but not mandatory
  if (!payload.recommended_action?.trim()) {
    warnings.push("recommended_action is missing");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Normalises validated threat data so downstream services receive
 * consistent values.
 */
export const normaliseThreatPayload = (
  payload: ThreatPayload,
): NormalisedThreatPayload => {
  return {
    ...payload,
    cyber_threat: payload.cyber_threat!.trim(),
    severity: payload.severity!.trim().toLowerCase() as ThreatSeverity,
    source: payload.source!.trim(),
    recommended_action: payload.recommended_action?.trim(),
  };
};

/**
 * Identifies threats requiring additional attention.
 *
 * A threat is considered high risk when:
 * - severity is high or critical, OR
 * - risk score is >= 0.8
 */
export const isHighRiskThreat = (
  payload: ThreatPayload,
): boolean => {
  const severity = payload.severity?.trim().toLowerCase();

  return (
    severity === "high" ||
    severity === "critical" ||
    (typeof payload.risk_score === "number" &&
      payload.risk_score >= 0.8)
  );
};