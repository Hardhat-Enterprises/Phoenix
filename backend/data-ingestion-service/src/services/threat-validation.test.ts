import {
  validateThreatPayload,
  normaliseThreatPayload,
  isHighRiskThreat,
} from "./threat-validation.service";

// VALID THREAT PAYLOAD
const validPayload = {
  cyber_threat: "Phishing Attack",
  severity: " HIGH ",
  confidence: 0.95,
  risk_score: 0.88,
  recommended_action: "Block suspicious IP range",
  source: "TEAVS",
};

console.log("\n=== VALID THREAT TEST ===");

const validResult = validateThreatPayload(validPayload);

console.log("Validation result:", validResult);

if (validResult.valid) {
  const normalised = normaliseThreatPayload(validPayload);

  console.log("Normalised payload:", normalised);
  console.log("High-risk threat:", isHighRiskThreat(normalised));
}

// INVALID THREAT PAYLOAD
const invalidPayload = {
  cyber_threat: "",
  severity: "extreme",
  confidence: 1.4,
  risk_score: -0.2,
  recommended_action: "",
  source: "",
};

console.log("\n=== INVALID THREAT TEST ===");

const invalidResult = validateThreatPayload(invalidPayload);

console.log("Validation result:", invalidResult);

console.log("\n=== THREAT VALIDATION DEMO COMPLETE ===");