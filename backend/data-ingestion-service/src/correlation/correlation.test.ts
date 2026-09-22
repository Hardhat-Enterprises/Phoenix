// The real @phoenix/common pulls in cache.service, which currently fails to
// compile on this branch. The module is mocked so the suite stays independent
// of that unrelated breakage. IntegrationLog.create is a jest.fn, which lets
// the integration logging tests inspect what would be written without a
// database.
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
 
import { IntegrationLog } from "@phoenix/common";
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
import {
  CorrelationInput,
  CorrelationProvider,
  CorrelationStatus,
} from "./correlation.types";
 
/**
 * These tests run with the fake provider and need no API key, no network
 * access, no database and no RabbitMQ.
 */
 
const provider = new FakeCorrelationProvider();
 
// Integration logging needs a database, so it is off except in the
// "integration logging" block, where IntegrationLog.create is mocked.
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
 
  it("preserves model version, evaluation time and status detail", async () => {
    const result = await provider.analyse({ text: "Flood warning issued" });
 
    expect(result.modelVersion).toBe(FAKE_MODEL_VERSION);
    expect(Number.isNaN(Date.parse(result.evaluatedAt))).toBe(false);
    expect(result.statusDetail.length).toBeGreaterThan(0);
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
 
  it("passes observed time and state through to the provider", async () => {
    const analyse = jest.fn((input: CorrelationInput) => provider.analyse(input));
    const spy: CorrelationProvider = { name: "spy", enabled: true, analyse };
    const input = {
      text: "Flood warning issued",
      observedTime: "2026-09-01T00:00:00Z",
      state: "VIC",
    };
 
    await processCorrelation(input, { provider: spy, writeIntegrationLog: false });
 
    expect(analyse).toHaveBeenCalledWith(input);
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
 
describe("integration logging", () => {
  const update = jest.fn();
  const create = IntegrationLog.create as unknown as jest.Mock;
  const loggedOptions = { provider, writeIntegrationLog: true };
  const lastUpdate = () => update.mock.calls[update.mock.calls.length - 1][0];
 
  beforeEach(() => {
    update.mockReset();
    create.mockReset();
    create.mockResolvedValue({ update });
  });
 
  it("records input, output, status, model version and status detail", async () => {
    const input = { text: "Flood warning issued" };
    const { result } = await processCorrelation(input, loggedOptions);
 
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        integration_type: "correlation",
        input: JSON.stringify(input),
        status: "created",
      }),
    );
 
    const final = lastUpdate();
    const output = JSON.parse(final.output);
 
    expect(final.status).toBe("completed");
    expect(output.status).toBe(CorrelationStatus.OK);
    expect(output.modelVersion).toBe(FAKE_MODEL_VERSION);
    expect(output.evaluatedAt).toBe(result?.evaluatedAt);
    expect(output.evidence).toEqual(result?.evidence);
    expect(final.note).toBe(result?.statusDetail);
  });
 
  it("records unavailable hazard data as inconclusive", async () => {
    const unavailable = new FakeCorrelationProvider({ hazardsUnavailable: true });
 
    const { result } = await processCorrelation(
      { text: "Flood warning" },
      { provider: unavailable, writeIntegrationLog: true },
    );
 
    const final = lastUpdate();
 
    expect(final.note).toBe(
      `${CorrelationStatus.NO_HAZARDS_AVAILABLE}: ${result?.statusDetail}`,
    );
    expect(JSON.parse(final.output).isHazardRelated).toBeNull();
  });
 
  it("keeps credentials out of the stored input", async () => {
    const input = {
      text: "Flood warning issued",
      apiKey: "sk-secret",
    } as unknown as CorrelationInput;
 
    await processCorrelation(input, loggedOptions);
 
    const stored = create.mock.calls[0][0].input as string;
 
    expect(stored).not.toContain("sk-secret");
    expect(stored).toContain("[redacted]");
  });
 
  it("records an error status when the provider throws", async () => {
    const failing = new FakeCorrelationProvider({
      failWith: new Error("provider down"),
    });
 
    const outcome = await processCorrelation(
      { text: "Flood warning" },
      { provider: failing, writeIntegrationLog: true },
    );
 
    expect(outcome.failed).toBe(true);
    expect(lastUpdate()).toEqual({ status: "error", note: "provider down" });
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