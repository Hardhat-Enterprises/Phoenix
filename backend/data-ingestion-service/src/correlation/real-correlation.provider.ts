import {
  CorrelationInput,
  CorrelationProvider,
  CorrelationResult,
  CorrelationStatus,
} from "./correlation.types";

/**
 * Adapter for the real correlation source.
 *
 * It is deliberately inactive. The correlation package described in the
 * integration guide is not available in this repository yet, so this class
 * defines the boundary without pretending to evaluate anything.
 *
 * When the package lands, implement callSource() and enable the provider
 * through configuration. Nothing else in the processing path needs to change,
 * because the service depends on the CorrelationProvider interface rather
 * than on any concrete provider.
 */

export const REAL_MODEL_VERSION = "real-correlation-unconfigured";

export interface RealCorrelationOptions {
  /** Off unless explicitly turned on. */
  enabled?: boolean;
  /** Base URL of the correlation source, when one exists. */
  baseUrl?: string;
  /**
   * Credential for the source. Never logged, never included in a result, and
   * never written to integration logging.
   */
  apiKey?: string;
}

export class RealCorrelationProvider implements CorrelationProvider {
  public readonly name = "real-correlation";
  public readonly enabled: boolean;

  private readonly options: RealCorrelationOptions;

  constructor(options: RealCorrelationOptions = {}) {
    this.options = options;

    // Enabled only when switched on AND configured. A half-configured
    // provider stays off rather than failing at call time.
    this.enabled = Boolean(
      options.enabled && options.baseUrl && options.apiKey,
    );
  }

  public async analyse(input: CorrelationInput): Promise<CorrelationResult> {
    const evaluatedAt = new Date().toISOString();

    if (!this.enabled) {
      return {
        status: CorrelationStatus.NO_HAZARDS_AVAILABLE,
        isHazardRelated: null,
        relationshipType: null,
        primaryHazard: null,
        matchCount: 0,
        correlationProbability: null,
        modelVersion: REAL_MODEL_VERSION,
        evaluatedAt,
        evidence: [],
        statusDetail:
          "The real correlation provider is not configured. Result is inconclusive.",
      };
    }

    // Left unimplemented on purpose. Implementing it against a guessed
    // contract would be worse than leaving the boundary explicit.
    throw new Error(
      "RealCorrelationProvider.analyse is not implemented. " +
        "Implement it once the correlation source package is available.",
    );
  }
}

/**
 * Builds the real provider from environment configuration.
 *
 * Reads credentials at construction time and keeps them inside the provider,
 * so no caller has to handle them.
 */
export const createRealCorrelationProvider = (
  env: NodeJS.ProcessEnv = process.env,
): RealCorrelationProvider =>
  new RealCorrelationProvider({
    enabled: env.CORRELATION_PROVIDER_ENABLED === "true",
    baseUrl: env.CORRELATION_PROVIDER_URL,
    apiKey: env.CORRELATION_PROVIDER_API_KEY,
  });