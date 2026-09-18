// The real @phoenix/common pulls in cache.service, which currently fails to
// compile on this branch. These tests never touch integration logging
// (writeIntegrationLog is false throughout), so the module is mocked to keep
// the suite independent of unrelated breakage.
jest.mock("@phoenix/common", () => ({
  IntegrationLog: { create: jest.fn() },
  IntegrationStatus: {
    CREATED: "created",
    PROCESSING: "processing",
    COMPLETED: "completed",
    ERROR: "error",
  },
  IntegrationType: {
    CORE: "core",
    ANOMALY: "anomaly",
    TIME_SERIES: "time-series",
    CORRELATION: "correlation",
  },
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import {
  FAKE_MODEL_VERSION,
  FakeCorrelationProvider,
} from "./fake-correlation.provider";
import { RealCorrelationProvider } from "./real-correlation.provider";
import {
  handleCorrelationMessage,
  processCorrelation,
  redactSensitive,
} from "./correlation.service";
import { CorrelationStatus } from "./correlation.types";

/**
 * These tests run with the fake provider and integration logging disabled,
 * so they need no API key, no network access, no database and no RabbitMQ.
 */

const provider = new FakeCorrelationProvider();

// Integration logging needs a database, so it is off throughout.
const options = { provider, writeIntegrationLog: false };

describe("fake correlation provider", () => {
  it("accepts text-only input", async () => {
    const result = await provider.analyse({ text: "Flood warning issued" });

    expect(result.status).toBe(CorrelationStatus.OK);
    expect(result.isHazardRelated).toBe(true);
    expect(result.modelVersion).toBe(FAKE_MODEL_VERSION);
  });

  it("accepts url-only input", async () => {
    const result = await provider.analyse({
      url: "https://example.com/bushfire-update",
    });

    expect(result.status).toBe(CorrelationStatus.OK);
    expect(result.isHazardRelated).toBe(true);
  });

  it("returns invalid_input when neither text nor url is supplied", async () => {
    const result = await provider.analyse({});

    expect(result.status).toBe(CorrelationStatus.INVALID_INPUT);
    // Not false: the input was never evaluated.
    expect(result.isHazardRelated).toBeNull();
    expect(result.statusDetail).toContain("text or url");
  });

  it("preserves the matched hazard and its evidence", async () => {
    const result = await provider.analyse({ text: "Levee breach in Lismore" });

    expect(result.primaryHazard?.hazardType).toBe("flood");
    expect(result.primaryHazard?.hazardLocation).toBe("Lismore NSW");
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it("keeps a primary match and a count when several hazards match", async () => {
    const result = await provider.analyse({
      text: "Storm front driving a bushfire toward the flood levee",
    });

    expect(result.matchCount).toBeGreaterThan(1);
    expect(result.primaryHazard).not.toBeNull();
    expect(result.relationshipType).toBe("multiple_related_events");
  });

  it("reports an evaluated non-match as false, not as unknown", async () => {
    const result = await provider.analyse({ text: "Quarterly sales report" });

    expect(result.status).toBe(CorrelationStatus.OK);
    expect(result.isHazardRelated).toBe(false);
    expect(result.matchCount).toBe(0);
  });
});

describe("unavailable hazard data", () => {
  const unavailable = new FakeCorrelationProvider({ hazardsUnavailable: true });

  it("is inconclusive rather than a non-match", async () => {
    const result = await unavailable.analyse({ text: "Flood warning" });

    expect(result.status).toBe(CorrelationStatus.NO_HAZARDS_AVAILABLE);
    expect(result.statusDetail).toContain("inconclusive");
  });

  it("never reports false when it could not evaluate", async () => {
    const result = await unavailable.analyse({ text: "Flood warning" });

    // The important guarantee: a consumer cannot read this as "checked and
    // not related", which would be a false reassurance.
    expect(result.isHazardRelated).toBeNull();
    expect(result.isHazardRelated).not.toBe(false);
  });
});

describe("correlation processing", () => {
  it("returns the provider result", async () => {
    const outcome = await processCorrelation(
      { text: "Bushfire near Gippsland" },
      options,
    );

    expect(outcome.failed).toBe(false);
    expect(outcome.result?.isHazardRelated).toBe(true);
  });

  it("does not throw when the provider fails", async () => {
    const failing = new FakeCorrelationProvider({
      failWith: new Error("provider exploded"),
    });

    const outcome = await processCorrelation(
      { text: "Flood warning" },
      { provider: failing, writeIntegrationLog: false },
    );

    // A queue consumer can still acknowledge the message.
    expect(outcome.failed).toBe(true);
    expect(outcome.result).toBeNull();
    expect(outcome.error).toContain("provider exploded");
  });

  it("handles a malformed queue message without throwing", async () => {
    const outcome = await handleCorrelationMessage("{not json", options);

    expect(outcome.failed).toBe(true);
    expect(outcome.error).toContain("Malformed message");
  });

  it("processes a valid queue message", async () => {
    const outcome = await handleCorrelationMessage(
      JSON.stringify({ text: "Storm damage reported" }),
      options,
    );

    expect(outcome.failed).toBe(false);
    expect(outcome.result?.status).toBe(CorrelationStatus.OK);
  });
});

describe("credential redaction", () => {
  it("removes sensitive keys before anything is logged", () => {
    const cleaned = redactSensitive({
      text: "Flood warning",
      apiKey: "super-secret",
      nested: { authorization: "Bearer abc", safe: "keep me" },
    }) as Record<string, unknown>;

    expect(cleaned.apiKey).toBe("[redacted]");
    expect((cleaned.nested as Record<string, unknown>).authorization).toBe(
      "[redacted]",
    );
    expect((cleaned.nested as Record<string, unknown>).safe).toBe("keep me");
    expect(cleaned.text).toBe("Flood warning");
  });
});

describe("real provider", () => {
  it("stays disabled without configuration", () => {
    const real = new RealCorrelationProvider();

    expect(real.enabled).toBe(false);
  });

  it("stays disabled when only partly configured", () => {
    const real = new RealCorrelationProvider({
      enabled: true,
      baseUrl: "https://example.com",
    });

    expect(real.enabled).toBe(false);
  });

  it("reports inconclusive rather than failing when disabled", async () => {
    const real = new RealCorrelationProvider();
    const result = await real.analyse({ text: "Flood warning" });

    expect(result.status).toBe(CorrelationStatus.NO_HAZARDS_AVAILABLE);
    expect(result.isHazardRelated).toBeNull();
  });

  it("can be enabled through configuration", () => {
    const real = new RealCorrelationProvider({
      enabled: true,
      baseUrl: "https://example.com",
      apiKey: "key",
    });

    expect(real.enabled).toBe(true);
  });
});