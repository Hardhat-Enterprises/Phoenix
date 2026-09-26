import crypto from "crypto";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface AdcrsRiskOutput {
  risk_score: number;
  confidence_score: number;
  predicted_class?: number;
  risk_level?: string;
  processed_at?: string;
  [key: string]: unknown;
}

export interface TeavsAlert {
  alert_id: string;
  source_integration_id: string;
  alert_type: "cyber_risk";
  title: string;
  message: string;
  severity: RiskLevel;
  risk_score: number;
  confidence_score: number;
  recommended_action: string;
  status: "pending_verification";
  created_at: string;
  payload_hash: string;
  signature: string;
  signature_algorithm: "HMAC-SHA256";
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sortForCanonicalJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortForCanonicalJson);
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = sortForCanonicalJson(value[key]);
        return sorted;
      }, {});
  }

  return value;
};

export const canonicalJson = (value: unknown): string =>
  JSON.stringify(sortForCanonicalJson(value));

const assertScore = (name: string, value: unknown): number => {
  const score = Number(value);

  if (!Number.isFinite(score) || score < 0 || score > 1) {
    throw new Error(`${name} must be a number between 0 and 1`);
  }

  return score;
};

export const riskLevelFromScore = (score: number): RiskLevel => {
  if (score >= 0.75) return "critical";
  if (score >= 0.5) return "high";
  if (score >= 0.25) return "medium";
  return "low";
};

export const validateAdcrsRiskOutput = (
  value: unknown,
): AdcrsRiskOutput & { risk_level: RiskLevel } => {
  if (!isPlainObject(value)) {
    throw new Error("ADCRS output must be a JSON object");
  }

  const riskScore = assertScore("risk_score", value.risk_score);
  const confidenceScore = assertScore(
    "confidence_score",
    value.confidence_score,
  );
  const calculatedRiskLevel = riskLevelFromScore(riskScore);
  const suppliedRiskLevel = String(value.risk_level || calculatedRiskLevel)
    .trim()
    .toLowerCase();

  if (!(["low", "medium", "high", "critical"] as string[]).includes(suppliedRiskLevel)) {
    throw new Error("risk_level must be low, medium, high, or critical");
  }

  if (suppliedRiskLevel !== calculatedRiskLevel) {
    throw new Error(
      `risk_level ${suppliedRiskLevel} does not match risk_score ${riskScore}`,
    );
  }

  return {
    ...value,
    risk_score: riskScore,
    confidence_score: confidenceScore,
    risk_level: calculatedRiskLevel,
  } as AdcrsRiskOutput & { risk_level: RiskLevel };
};

const recommendedActionFor = (riskLevel: RiskLevel): string => {
  switch (riskLevel) {
    case "critical":
      return "Immediately escalate to a security analyst and verify the alert before urgent distribution.";
    case "high":
      return "Prioritise analyst review and verify the alert before distribution.";
    case "medium":
      return "Review the supporting evidence and monitor for escalation.";
    default:
      return "Continue monitoring and retain the assessment for audit.";
  }
};

const textValue = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

export const createTeavsAlert = (options: {
  sourceIntegrationId: string;
  input: Record<string, unknown>;
  output: unknown;
  signingSecret: string;
  createdAt?: string;
}): TeavsAlert => {
  const { sourceIntegrationId, input, output, signingSecret } = options;

  if (!sourceIntegrationId) {
    throw new Error("sourceIntegrationId is required");
  }

  if (!signingSecret || signingSecret.length < 32) {
    throw new Error("TEAVS signing secret must contain at least 32 characters");
  }

  const risk = validateAdcrsRiskOutput(output);
  const createdAt = options.createdAt || risk.processed_at || new Date().toISOString();
  const hazardType = textValue(input.hazard_type) || "cyber event";
  const location = textValue(input.hazard_location);
  const alertId = crypto.randomUUID();

  const unsignedAlert = {
    alert_id: alertId,
    source_integration_id: sourceIntegrationId,
    alert_type: "cyber_risk" as const,
    title: `${risk.risk_level.toUpperCase()} cyber risk - ${hazardType}`,
    message: location
      ? `ADCRS identified a ${risk.risk_level} cyber risk associated with ${hazardType} in ${location}.`
      : `ADCRS identified a ${risk.risk_level} cyber risk associated with ${hazardType}.`,
    severity: risk.risk_level,
    risk_score: risk.risk_score,
    confidence_score: risk.confidence_score,
    recommended_action: recommendedActionFor(risk.risk_level),
    status: "pending_verification" as const,
    created_at: createdAt,
  };

  const canonicalPayload = canonicalJson(unsignedAlert);
  const payloadHash = crypto
    .createHash("sha256")
    .update(canonicalPayload)
    .digest("hex");
  const signature = crypto
    .createHmac("sha256", signingSecret)
    .update(canonicalPayload)
    .digest("hex");

  return {
    ...unsignedAlert,
    payload_hash: payloadHash,
    signature,
    signature_algorithm: "HMAC-SHA256",
  };
};

export const verifyTeavsAlert = (
  alert: TeavsAlert,
  signingSecret: string,
): boolean => {
  if (!signingSecret || signingSecret.length < 32) return false;

  const {
    payload_hash: payloadHash,
    signature,
    signature_algorithm: _signatureAlgorithm,
    ...unsignedAlert
  } = alert;
  const canonicalPayload = canonicalJson(unsignedAlert);
  const expectedHash = crypto
    .createHash("sha256")
    .update(canonicalPayload)
    .digest("hex");
  const expectedSignature = crypto
    .createHmac("sha256", signingSecret)
    .update(canonicalPayload)
    .digest("hex");

  const safeCompare = (left: string, right: string): boolean => {
    const leftBuffer = Buffer.from(left, "hex");
    const rightBuffer = Buffer.from(right, "hex");

    return (
      leftBuffer.length === rightBuffer.length &&
      crypto.timingSafeEqual(leftBuffer, rightBuffer)
    );
  };

  return (
    safeCompare(payloadHash, expectedHash) &&
    safeCompare(signature, expectedSignature)
  );
};
