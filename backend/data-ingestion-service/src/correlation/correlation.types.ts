/**
 * Contract for hazard correlation.
 *
 * Correlation answers one question only: is this content related to a known
 * hazard event? It is deliberately separate from phishing classification and
 * from combined risk scoring, which remain distinct outputs.
 */

/** Outcome of a correlation attempt. */
export enum CorrelationStatus {
  /** The provider evaluated the input and reached a conclusion. */
  OK = "ok",
  /** Neither text nor url was supplied. */
  INVALID_INPUT = "invalid_input",
  /** No hazard data was available to compare against. */
  NO_HAZARDS_AVAILABLE = "no_hazards_available",
}

export interface CorrelationInput {
  text?: string;
  url?: string;
  /** ISO timestamp of when the content was observed. */
  observedAt?: string;
  /** Australian state or territory code, when known. */
  state?: string;
}

export interface CorrelationHazard {
  hazardEventId?: string | number;
  hazardType?: string;
  hazardLocation?: string;
  alertLevel?: string;
  hazardStatus?: string;
}

export interface CorrelationResult {
  status: CorrelationStatus;

  /**
   * Null unless status is OK.
   *
   * A provider that could not evaluate the input must not report false, since
   * false means "evaluated and not related". Callers that treat null as false
   * would turn "we do not know" into "we checked and it is fine".
   */
  isHazardRelated: boolean | null;

  /** Provider's label for the link, e.g. "same_event". Null when not OK. */
  relationshipType: string | null;

  /** Highest-ranked match. Null when there is none. */
  primaryHazard: CorrelationHazard | null;

  /** Total hazards matched. Zero when none or when not evaluated. */
  matchCount: number;

  /**
   * Uncalibrated rule score from the provider, if it supplies one.
   *
   * This is NOT a confidence value and NOT a probability that the result is
   * correct. Consumers must not label it as either.
   */
  correlationProbability: number | null;

  /** Identifies the logic that produced the result. */
  modelVersion: string;

  /** ISO timestamp of evaluation. */
  evaluatedAt: string;

  /** Short human-readable reasons supporting the result. */
  evidence: string[];

  /** Explains the status, especially for non-OK outcomes. */
  statusDetail: string;
}

/**
 * The boundary every correlation provider implements.
 *
 * The processing service depends on this interface rather than any concrete
 * provider, so tests can supply a deterministic fake and no network or API
 * key is needed to run them.
 */
export interface CorrelationProvider {
  readonly name: string;
  readonly enabled: boolean;
  analyse(input: CorrelationInput): Promise<CorrelationResult>;
}