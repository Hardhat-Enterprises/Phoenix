import { describe, expect, it } from "vitest";
import {
  adaptCorrelationResult,
  adaptNotificationCorrelation,
} from "./correlationResultAdapter";
import { CORRELATION_FIXTURES } from "./correlationResultFixtures";

describe("adaptCorrelationResult", () => {
  it("normalises a related result", () => {
    const result = adaptCorrelationResult(
      CORRELATION_FIXTURES.related,
    );

    expect(result.presentationState).toBe("related");
    expect(result.isHazardRelated).toBe(true);
    expect(result.hazard?.type).toBe("Bushfire");
    expect(result.hazard?.location?.displayName).toContain(
      "Ballarat",
    );
    expect(result.correlationScore).toBe(0.82);
  });

  it("normalises an unrelated result without implying safety", () => {
    const result = adaptCorrelationResult(
      CORRELATION_FIXTURES.unrelated,
    );

    expect(result.presentationState).toBe("unrelated");
    expect(result.isHazardRelated).toBe(false);
    expect(result.relationshipType).toBe("unrelated");
  });

  it("maps no_hazards_available to inconclusive", () => {
    const result = adaptCorrelationResult(
      CORRELATION_FIXTURES.inconclusive,
    );

    expect(result.presentationState).toBe("inconclusive");
    expect(result.status).toBe("no_hazards_available");
  });

  it("maps invalid_input to an invalid state", () => {
    const result = adaptCorrelationResult(
      CORRELATION_FIXTURES.invalid,
    );

    expect(result.presentationState).toBe("invalid");
    expect(result.status).toBe("invalid_input");
  });

  it("handles processing safely", () => {
    const result = adaptCorrelationResult(
      CORRELATION_FIXTURES.processing,
    );

    expect(result.presentationState).toBe("processing");
    expect(result.status).toBe("processing");
  });

  it("handles unavailable safely", () => {
    const result = adaptCorrelationResult(
      CORRELATION_FIXTURES.unavailable,
    );

    expect(result.presentationState).toBe("unavailable");
  });

  it("handles malformed payloads without throwing", () => {
    expect(() =>
      adaptCorrelationResult(CORRELATION_FIXTURES.malformed),
    ).not.toThrow();

    const result = adaptCorrelationResult(
      CORRELATION_FIXTURES.malformed,
    );

    expect(result.presentationState).toBe("unavailable");
  });

  it("preserves the primary hazard and multiple match count", () => {
    const result = adaptCorrelationResult(
      CORRELATION_FIXTURES.multipleMatches,
    );

    expect(result.presentationState).toBe("related");
    expect(result.hazard?.type).toBe("Flood");
    expect(result.matchCount).toBe(3);
  });

  it("handles a missing hazard location safely", () => {
    const result = adaptCorrelationResult(
      CORRELATION_FIXTURES.missingLocation,
    );

    expect(result.presentationState).toBe("related");
    expect(result.hazard?.type).toBe("Storm");
    expect(result.hazard?.location?.displayName).toBeNull();
  });

  it("normalises unknown relationship types", () => {
    const result = adaptCorrelationResult(
      CORRELATION_FIXTURES.unknownRelationship,
    );

    expect(result.relationshipType).toBe("unknown");
  });

it("preserves the refined phishing relationship when phishing context is applied", () => {
  const result = adaptCorrelationResult(
    CORRELATION_FIXTURES.phishingRefined,
  );

  expect(result.relationshipType).toBe("fake_relief_or_donation");
});

  it("does not expose malicious when phishing is not refined", () => {
    const result = adaptCorrelationResult(
      CORRELATION_FIXTURES.unrefinedPhishingRelationship,
    );

    expect(result.relationshipType).not.toBe("malicious");
  });
});

describe("adaptNotificationCorrelation", () => {
  it("returns unavailable when notification metadata is missing", () => {
    const result = adaptNotificationCorrelation(null);

    expect(result.presentationState).toBe("unavailable");
    expect(result.source).toBe("notification");
  });

  it("adapts embedded notification correlation data", () => {
    const result = adaptNotificationCorrelation({
      correlation_result: CORRELATION_FIXTURES.related,
    });

    expect(result.presentationState).toBe("related");
    expect(result.hazard?.type).toBe("Bushfire");
  });

  it("does not throw for malformed notification metadata", () => {
    expect(() =>
      adaptNotificationCorrelation({
        correlation_result: "invalid",
      }),
    ).not.toThrow();

    const result = adaptNotificationCorrelation({
      correlation_result: "invalid",
    });

    expect(result.presentationState).toBe("unavailable");
  });
});