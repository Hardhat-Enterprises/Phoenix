import {
  CorrelationHazard,
  CorrelationInput,
  CorrelationProvider,
  CorrelationResult,
  CorrelationStatus,
} from "./correlation.types";

/**
 * Deterministic correlation provider for tests and local development.
 *
 * It performs no network calls and needs no API key, so the processing
 * service can be tested without the real correlation package, without
 * RabbitMQ, and without external access.
 *
 * Matching is keyword based and intentionally simple. This is a stand-in for
 * the real provider's rules, not an attempt to reproduce them.
 */

export const FAKE_MODEL_VERSION = "fake-correlation-0.1.0";

const FIXTURE_HAZARDS: Record<string, CorrelationHazard> = {
  flood: {
    hazardEventId: "hz-flood-001",
    hazardType: "flood",
    hazardLocation: "Lismore NSW",
    alertLevel: "emergency",
    hazardStatus: "active",
  },
  bushfire: {
    hazardEventId: "hz-fire-002",
    hazardType: "bushfire",
    hazardLocation: "Gippsland VIC",
    alertLevel: "watch_and_act",
    hazardStatus: "active",
  },
  storm: {
    hazardEventId: "hz-storm-003",
    hazardType: "storm",
    hazardLocation: "Brisbane QLD",
    alertLevel: "advice",
    hazardStatus: "monitoring",
  },
};

const KEYWORDS: Record<string, string[]> = {
  flood: ["flood", "flooding", "levee", "inundation"],
  bushfire: ["bushfire", "fire", "ember", "blaze"],
  storm: ["storm", "cyclone", "hail", "gale"],
};

/** Text used for matching, drawn from both the message and the URL. */
const searchableText = (input: CorrelationInput): string =>
  `${input.text ?? ""} ${input.url ?? ""}`.toLowerCase();

const hasText = (value?: string): boolean =>
  typeof value === "string" && value.trim() !== "";

export interface FakeCorrelationOptions {
  /**
   * Simulates the hazard source being empty or unreachable. Every call then
   * returns no_hazards_available rather than a false negative.
   */
  hazardsUnavailable?: boolean;
  /** Makes analyse() reject, so callers can be tested against a failure. */
  failWith?: Error;
  /** Fixed evaluation timestamp so assertions stay stable. */
  now?: () => Date;
}

export class FakeCorrelationProvider implements CorrelationProvider {
  public readonly name = "fake-correlation";
  public readonly enabled = true;

  private readonly options: FakeCorrelationOptions;

  constructor(options: FakeCorrelationOptions = {}) {
    this.options = options;
  }

  public async analyse(input: CorrelationInput): Promise<CorrelationResult> {
    if (this.options.failWith) {
      throw this.options.failWith;
    }

    const evaluatedAt = (this.options.now?.() ?? new Date()).toISOString();

    // At least one of text or url is required.
    if (!hasText(input?.text) && !hasText(input?.url)) {
      return {
        status: CorrelationStatus.INVALID_INPUT,
        isHazardRelated: null,
        relationshipType: null,
        primaryHazard: null,
        matchCount: 0,
        correlationProbability: null,
        modelVersion: FAKE_MODEL_VERSION,
        evaluatedAt,
        evidence: [],
        statusDetail: "Provide either text or url to correlate.",
      };
    }

    // Without hazard data the answer is inconclusive, never "not related".
    if (this.options.hazardsUnavailable) {
      return {
        status: CorrelationStatus.NO_HAZARDS_AVAILABLE,
        isHazardRelated: null,
        relationshipType: null,
        primaryHazard: null,
        matchCount: 0,
        correlationProbability: null,
        modelVersion: FAKE_MODEL_VERSION,
        evaluatedAt,
        evidence: [],
        statusDetail:
          "No hazard records were available to compare against. Result is inconclusive.",
      };
    }

    const haystack = searchableText(input);
    const matchedKeys: string[] = [];
    const evidence: string[] = [];

    Object.entries(KEYWORDS).forEach(([hazardKey, words]) => {
      const hit = words.find((word) => haystack.includes(word));

      if (hit) {
        matchedKeys.push(hazardKey);
        evidence.push(`Matched keyword "${hit}" against ${hazardKey} hazard.`);
      }
    });

    if (matchedKeys.length === 0) {
      return {
        status: CorrelationStatus.OK,
        isHazardRelated: false,
        relationshipType: "none",
        primaryHazard: null,
        matchCount: 0,
        correlationProbability: 0,
        modelVersion: FAKE_MODEL_VERSION,
        evaluatedAt,
        evidence: ["No hazard keywords were found in the supplied content."],
        statusDetail: "Evaluated against available hazards with no match.",
      };
    }

    const [primaryKey] = matchedKeys;

    if (input.state) {
      evidence.push(`Reported state: ${input.state}.`);
    }

    return {
      status: CorrelationStatus.OK,
      isHazardRelated: true,
      relationshipType:
        matchedKeys.length > 1 ? "multiple_related_events" : "same_event",
      primaryHazard: FIXTURE_HAZARDS[primaryKey],
      matchCount: matchedKeys.length,
      // Uncalibrated rule score, not a confidence value.
      correlationProbability: Math.min(0.5 + matchedKeys.length * 0.2, 1),
      modelVersion: FAKE_MODEL_VERSION,
      evaluatedAt,
      evidence,
      statusDetail: "Evaluated against available hazards.",
    };
  }
}