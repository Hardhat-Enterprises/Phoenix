/**
 * Response Decision Manager
 *
 * Implements the missing combination step shown in the Threat Analysis Integration
 * Workflow Diagram and Sequence Diagram (Section 6: "Combine Threat-Analysis Results")
 * and Section 7 ("Response Decision") of the Sequence Diagram document.
 *
 * Today, two independent classification stages exist in the codebase but are never
 * combined:
 *   - Stage 1: the rule-based Threat Analysis Engine
 *     (cyber/cyber/detection-response/detection_rules.py), which returns a discrete
 *     severity of "Normal" | "Medium" | "High" | "Critical" plus a specific action code.
 *   - Stage 2: the ADCRS Risk Scoring Engine (./teavs-adcrs.ts), which returns a
 *     continuous risk_score/confidence_score (0-1) converted into a risk_level of
 *     "low" | "medium" | "high" | "critical".
 *
 * This module is the Response Decision Manager: it takes one result from each stage
 * and produces the single, final threat-analysis result described in the Threat
 * Analysis Integration Design Document (Section 7, "Expected Output Structure").
 *
 * Design decision: when the two stages disagree, the HIGHER severity always wins.
 * This is a deliberate fail-safe choice (never silently downgrade a risk) and is
 * also what resolves the discrepancy documented in the Risk Score & Threat
 * Classification Mapping: a rule-engine "Critical" combined with an ADCRS "high"
 * should not be reported to the team as "High" overall.
 */

import { AdcrsRiskOutput, RiskLevel, validateAdcrsRiskOutput } from "./teavs-adcrs";

/** Mirrors the dict shape returned by every detect_*() function in detection_rules.py */
export type RuleEngineSeverity = "Normal" | "Medium" | "High" | "Critical";

export interface RuleEngineResult {
  threat: string;
  severity: RuleEngineSeverity;
  action: string | null;
}

export type FinalSeverity = "Low" | "Medium" | "High" | "Critical";

export interface CombinedThreatAnalysisResult {
  event_id: string;
  threat_type: string;
  severity: FinalSeverity;
  risk_score: number;
  confidence_score: number;
  recommended_action: string;
  notification_required: boolean;
  status: "detected" | "no_threat_detected";
}

/** Ordinal scale shared by both stages, low → critical. Used to pick the higher of the two. */
const SEVERITY_RANK: Record<string, number> = {
  normal: 0,
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const RANK_TO_FINAL_SEVERITY: FinalSeverity[] = ["Low", "Medium", "High", "Critical"];

/** Generic, human-readable fallback action when the rule engine found nothing actionable. */
const FALLBACK_ACTION_BY_RANK: string[] = [
  "Continue monitoring and retain the assessment for audit.",
  "Review the supporting evidence and monitor for escalation.",
  "Prioritise analyst review and verify the alert before distribution.",
  "Immediately escalate to a security analyst and verify the alert before urgent distribution.",
];

const rankOf = (level: string): number => {
  const rank = SEVERITY_RANK[level.toLowerCase()];
  if (rank === undefined) {
    throw new Error(`Unrecognised severity/risk level: "${level}"`);
  }
  return rank;
};

/**
 * Combines a Stage 1 rule-engine result with a Stage 2 ADCRS result into the
 * final threat-analysis output. Throws if the ADCRS output fails validation
 * (see validateAdcrsRiskOutput in teavs-adcrs.ts) so a malformed upstream
 * result never silently produces a false "Low" severity.
 */
export function combineThreatAnalysis(
  eventId: string,
  ruleResult: RuleEngineResult,
  adcrsOutput: AdcrsRiskOutput,
): CombinedThreatAnalysisResult {
  const adcrs = validateAdcrsRiskOutput(adcrsOutput);

  const ruleRank = rankOf(ruleResult.severity);
  const adcrsRank = rankOf(adcrs.risk_level);
  const finalRank = Math.max(ruleRank, adcrsRank);
  const finalSeverity = RANK_TO_FINAL_SEVERITY[finalRank];

  // Prefer the rule engine's specific action (e.g. "lock_account") only when the rule
  // engine's own severity is what determined the final severity. If ADCRS alone pushed
  // the final severity higher than what the rule engine found, the rule's action was
  // calibrated for its own (lower) tier and should not be reused as-is — fall back to
  // the generic action for the escalated tier instead.
  const ruleActionStillApplies = ruleResult.action !== null && ruleRank === finalRank;
  const recommendedAction = ruleActionStillApplies
    ? (ruleResult.action as string)
    : FALLBACK_ACTION_BY_RANK[finalRank];

  const threatDetected = ruleRank > 0 || adcrsRank > 0;

  return {
    event_id: eventId,
    threat_type: ruleResult.threat,
    severity: finalSeverity,
    risk_score: adcrs.risk_score,
    confidence_score: adcrs.confidence_score,
    recommended_action: recommendedAction,
    notification_required: finalRank >= SEVERITY_RANK.high, // High or Critical
    status: threatDetected ? "detected" : "no_threat_detected",
  };
}

// Runnable demonstration — mirrors the `if __name__ == "__main__":` convention already
// used in cyber/cyber/detection-response/detection_rules.py. Run with:
//   npx ts-node response-decision.ts
if (require.main === module) {
  // The team's own shared worked example (EVT-001, login_activity), reconstructed from
  // the Design Document, Workflow Diagram and Sequence Diagram — but fed through the
  // REAL rule engine's outcome for "failed_attempts > 10" and the real ADCRS threshold
  // function, instead of the inconsistent numbers the documents currently show.
  const ruleStageResult: RuleEngineResult = {
    threat: "Login Attack",
    severity: "Critical", // detect_login_attack(): failed_attempts > 10 -> Critical
    action: "lock_account",
  };

  const adcrsStageResult: AdcrsRiskOutput = {
    risk_score: 0.82,
    confidence_score: 0.91,
  };

  const result = combineThreatAnalysis("EVT-001", ruleStageResult, adcrsStageResult);
  console.log(JSON.stringify(result, null, 2));

  // Second example: the two stages genuinely disagree, to show the "take the higher" rule.
  const quietRule: RuleEngineResult = {
    threat: "Phishing/Scam",
    severity: "Medium",
    action: "flag_sender",
  };
  const highAdcrs: AdcrsRiskOutput = { risk_score: 0.55, confidence_score: 0.7 };
  console.log(JSON.stringify(combineThreatAnalysis("EVT-002", quietRule, highAdcrs), null, 2));
}
