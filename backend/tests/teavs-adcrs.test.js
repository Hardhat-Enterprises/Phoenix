const assert = require("node:assert/strict");
const test = require("node:test");

const {
  canonicalJson,
  createTeavsAlert,
  validateAdcrsRiskOutput,
  verifyTeavsAlert,
} = require("../dist/libs/common/src/helper/teavs-adcrs.js");

const SIGNING_SECRET = "test-only-secret-with-at-least-32-characters";

test("canonical JSON is stable regardless of object key order", () => {
  assert.equal(
    canonicalJson({ z: 1, nested: { b: 2, a: 1 }, a: 2 }),
    canonicalJson({ a: 2, nested: { a: 1, b: 2 }, z: 1 }),
  );
});

test("ADCRS output is converted into a signed TEAVS alert", () => {
  const alert = createTeavsAlert({
    sourceIntegrationId: "2f013c55-4a44-4021-a726-75e21ca9f553",
    input: {
      hazard_type: "flood",
      hazard_location: "Victoria",
    },
    output: {
      risk_score: 0.82,
      confidence_score: 0.91,
      predicted_class: 3,
      risk_level: "Critical",
    },
    signingSecret: SIGNING_SECRET,
    createdAt: "2026-08-22T00:00:00.000Z",
  });

  assert.equal(alert.severity, "critical");
  assert.equal(alert.status, "pending_verification");
  assert.equal(alert.signature_algorithm, "HMAC-SHA256");
  assert.equal(alert.payload_hash.length, 64);
  assert.equal(alert.signature.length, 64);
  assert.equal(verifyTeavsAlert(alert, SIGNING_SECRET), true);
});

test("TEAVS verification rejects a tampered alert", () => {
  const alert = createTeavsAlert({
    sourceIntegrationId: "2f013c55-4a44-4021-a726-75e21ca9f553",
    input: { hazard_type: "bushfire" },
    output: {
      risk_score: 0.55,
      confidence_score: 0.8,
      risk_level: "high",
    },
    signingSecret: SIGNING_SECRET,
  });

  alert.message = "Tampered message";
  assert.equal(verifyTeavsAlert(alert, SIGNING_SECRET), false);
});

test("ADCRS validation rejects inconsistent risk scoring", () => {
  assert.throws(
    () =>
      validateAdcrsRiskOutput({
        risk_score: 0.9,
        confidence_score: 0.8,
        risk_level: "low",
      }),
    /does not match risk_score/,
  );
});

test("alert signing refuses weak secrets", () => {
  assert.throws(
    () =>
      createTeavsAlert({
        sourceIntegrationId: "2f013c55-4a44-4021-a726-75e21ca9f553",
        input: {},
        output: {
          risk_score: 0.1,
          confidence_score: 0.7,
          risk_level: "low",
        },
        signingSecret: "too-short",
      }),
    /at least 32 characters/,
  );
});
