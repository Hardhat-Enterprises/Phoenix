// riskAssessmentApi.js
//
// Adapter layer for the Risk-Assessment feature (Varun Reddy Maligireddy).
//
// Sprint 1: built the demo prototype and documented the confirmed live shape.
// Sprint 2 ("Risk and Anomaly Feature Control"): the supplied backend for
// this environment does not actually expose the risk-assessment endpoints,
// so:
//   - demo mode is now controlled by an environment feature flag, not a
//     hardcoded constant, so it can be switched per-environment without a
//     code change.
//   - when demo mode is off and the live endpoint is unreachable/unsupported,
//     the UI shows an honest "Not available in this environment" state
//     rather than a generic, alarming error (see getRiskAssessments below).
//
// IMPORTANT: this file must never let demo data be mistaken for real
// integration data. Every demo record carries `isDemo: true`, and the UI
// must always surface a "Demo data" label when isDemo is true. Per the
// sprint brief: do NOT present integration logs as risk assessments — this
// adapter only ever calls /api/users/risk-assessments, never the
// integrations endpoint, so that fallback never existed here to begin with.

import { RISK_ASSESSMENT_DEMO_MODE } from "../config/environment";

const DEMO_MODE = RISK_ASSESSMENT_DEMO_MODE;

const demoRiskAssessments = [
  {
    id: "RA-1001",
    correlationScore: 0.82,
    linkageReason:
      "Shared IP range observed between a reported flood hazard's control-system telemetry and an inbound threat signal.",
    integrationConfidence: "High",
    linkedEventType: "Flood - Cyber Overlap",
    eventStatus: "Active",
    relatedHazardId: "HZ-2044",
    relatedThreatId: "TH-7781",
    eventTime: "2026-07-18T09:15:00Z",
    detectedTime: "2026-07-18T09:20:00Z",
    reportedTime: "2026-07-18T10:05:00Z",
    createdAt: "2026-07-18T10:06:00Z",
    updatedAt: "2026-07-19T08:30:00Z",
    isDemo: true,
  },
  {
    id: "RA-1002",
    correlationScore: 0.47,
    linkageReason:
      "Overlapping timeframe between a bushfire evacuation order and a phishing campaign impersonating emergency alerts.",
    integrationConfidence: "Medium",
    linkedEventType: "Bushfire - Phishing Overlap",
    eventStatus: "Under Review",
    relatedHazardId: "HZ-1987",
    relatedThreatId: "TH-7790",
    eventTime: "2026-07-15T14:40:00Z",
    detectedTime: "2026-07-15T15:02:00Z",
    reportedTime: "2026-07-15T16:11:00Z",
    createdAt: "2026-07-15T16:12:00Z",
    updatedAt: "2026-07-16T09:45:00Z",
    isDemo: true,
  },
  {
    id: "RA-1003",
    correlationScore: 0.19,
    linkageReason:
      "Low-confidence match: same local government area referenced in both records, no shared technical indicators.",
    integrationConfidence: "Low",
    linkedEventType: "Storm - Network Outage Overlap",
    eventStatus: "Dismissed",
    relatedHazardId: "HZ-2011",
    relatedThreatId: "TH-7803",
    eventTime: "2026-07-10T03:00:00Z",
    detectedTime: "2026-07-10T03:40:00Z",
    reportedTime: "2026-07-10T06:00:00Z",
    createdAt: "2026-07-10T06:01:00Z",
    updatedAt: "2026-07-11T11:20:00Z",
    isDemo: true,
  },
];

function simulateNetwork(value, { fail = false, delayMs = 400 } = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (fail) reject(new Error("Simulated network failure"));
      else resolve(value);
    }, delayMs);
  });
}

// --- Live API normalization -------------------------------------------------
//
// Documented shape from Aayan's PHOENIX API Endpoint Documentation (Section 8)
// — kept here for when the endpoint actually becomes available in a given
// environment. See also docs/RISK_ANOMALY_FIELDS.md for the future
// model-output fields (phishing probability, hazard-correlation probability,
// relationship type, evidence, priority, model version) that are not part of
// this shape yet.
//
// List item shape (GET /api/users/risk-assessments):
//   { integration_event_id, related_hazard_event_id, related_threat_id,
//     correlation_score, linkage_reason, integration_confidence,
//     linked_event_type (uuid string), event_status (uuid string), event_time }
//
// Detail shape (GET /api/users/risk-assessments/:id):
//   { integration_event_id, hazard: {...}, threat: {...}, correlation_score,
//     linkage_reason, integration_confidence,
//     linked_event_type: { linked_event_type_id, linked_event_type_description },
//     event_status: { event_status_id, event_status_description },
//     event_time, detected_at, reported_at, created_at, updated_at }
//
// Both endpoints wrap the payload as { status, message, data } — and per the
// documented examples, `data` is an array in both cases (even for a single record).

function confidenceLabel(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "Unknown";
  if (num >= 0.75) return "High";
  if (num >= 0.45) return "Medium";
  return "Low";
}

function readDescriptive(value, descriptionKey) {
  if (value && typeof value === "object") {
    return value[descriptionKey] || value.id || "Unknown";
  }
  return value || "Unknown";
}

function normalizeAssessment(record) {
  return {
    id: record.integration_event_id,
    correlationScore: record.correlation_score,
    linkageReason: record.linkage_reason,
    integrationConfidence: confidenceLabel(record.integration_confidence),
    linkedEventType: readDescriptive(record.linked_event_type, "linked_event_type_description"),
    eventStatus: readDescriptive(record.event_status, "event_status_description"),
    relatedHazardId:
      record.related_hazard_event_id || record.hazard?.hazard_event_id || null,
    relatedThreatId:
      record.related_threat_id || record.threat?.threat_id || null,
    eventTime: record.event_time,
    detectedTime: record.detected_at,
    reportedTime: record.reported_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    isDemo: false,
  };
}

function unwrapData(json) {
  if (Array.isArray(json?.data)) return json.data;
  if (json?.data) return [json.data];
  return [];
}

// This environment's supplied backend does not expose the risk-assessment
// endpoints at all — so any failure while DEMO_MODE is off is treated as
// "not available in this environment" rather than a generic, alarming
// error. This keeps the message honest about what's actually going on
// (the feature isn't wired up here yet) instead of implying something is
// broken that the person could fix by retrying.
function makeUnavailableError() {
  const error = new Error(
    "Risk assessment data is not available in this environment.",
  );
  error.code = "RISK_BACKEND_UNAVAILABLE";
  return error;
}

/**
 * Fetch the list of risk assessments.
 * Returns: { data: RiskAssessment[], demo: boolean }
 */
export async function getRiskAssessments() {
  if (DEMO_MODE) {
    const data = await simulateNetwork(demoRiskAssessments);
    return { data, demo: true };
  }

  try {
    const res = await fetch("/api/users/risk-assessments");
    if (!res.ok) {
      throw new Error(`status ${res.status}`);
    }
    const json = await res.json();
    const data = unwrapData(json).map(normalizeAssessment);
    return { data, demo: false };
  } catch {
    throw makeUnavailableError();
  }
}

/**
 * Fetch a single risk assessment by its stable ID.
 * Returns: { data: RiskAssessment, demo: boolean }
 */
export async function getRiskAssessmentById(assessmentId) {
  if (DEMO_MODE) {
    const found = demoRiskAssessments.find((r) => r.id === assessmentId);
    if (!found) {
      await simulateNetwork(null, { delayMs: 250 });
      throw new Error("NOT_FOUND");
    }
    const data = await simulateNetwork(found);
    return { data, demo: true };
  }

  try {
    const res = await fetch(`/api/users/risk-assessments/${assessmentId}`);
    if (res.status === 404) throw new Error("NOT_FOUND");
    if (!res.ok) {
      throw new Error(`status ${res.status}`);
    }
    const json = await res.json();
    const [record] = unwrapData(json);
    if (!record) throw new Error("NOT_FOUND");
    const data = normalizeAssessment(record);
    return { data, demo: false };
  } catch (err) {
    if (err.message === "NOT_FOUND") throw err;
    throw makeUnavailableError();
  }
}
