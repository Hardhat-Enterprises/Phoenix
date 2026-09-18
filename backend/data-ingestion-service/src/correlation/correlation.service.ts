import {
  IntegrationLog,
  IntegrationStatus,
  IntegrationType,
  logger,
} from "@phoenix/common";
import {
  CorrelationInput,
  CorrelationProvider,
  CorrelationResult,
  CorrelationStatus,
} from "./correlation.types";

/**
 * Hazard correlation processing.
 *
 * This runs as its own integration, separate from core model inference. It
 * does not read, modify, or depend on the XGBoost path in ingestion.service,
 * and it writes its own integration_log rows under the "correlation" type.
 *
 * Correlation answers only whether content relates to a known hazard event.
 * Phishing classification and combined risk scoring remain separate outputs
 * produced elsewhere.
 *
 * The provider arrives as an argument rather than being imported, so tests
 * can pass a deterministic fake and run with no network, no API key, and no
 * RabbitMQ.
 */

/** Fields that must never reach a log or a stored payload. */
const SENSITIVE_KEYS = [
  "apikey",
  "api_key",
  "authorization",
  "password",
  "secret",
  "token",
];

/**
 * Removes credentials before anything is written to integration logging.
 * Keys are matched case-insensitively and nested objects are cleaned too.
 */
export const redactSensitive = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactSensitive);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
        if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
          return [key, "[redacted]"];
        }

        return [key, redactSensitive(entry)];
      }),
    );
  }

  return value;
};

export interface CorrelationProcessingOptions {
  /** Supplied by the caller. Tests pass the fake provider. */
  provider: CorrelationProvider;
  /** Set false to skip database writes in unit tests. */
  writeIntegrationLog?: boolean;
}

export interface CorrelationProcessingOutcome {
  result: CorrelationResult | null;
  /** True when the provider threw rather than returning a result. */
  failed: boolean;
  /** Present when failed is true. */
  error?: string;
}

const isInconclusive = (result: CorrelationResult): boolean =>
  result.status !== CorrelationStatus.OK;

/**
 * Runs one correlation and records it.
 *
 * Callable directly from a test with no queue involved. Never throws: a
 * provider failure is returned as an outcome so a queue consumer can
 * acknowledge the message and carry on.
 */
export const processCorrelation = async (
  input: CorrelationInput,
  options: CorrelationProcessingOptions,
): Promise<CorrelationProcessingOutcome> => {
  const { provider, writeIntegrationLog = true } = options;
  const safeInput = redactSensitive(input);

  let integrationLog: IntegrationLog | null = null;

  if (writeIntegrationLog) {
    integrationLog = await IntegrationLog.create({
      integration_type: IntegrationType.CORRELATION,
      input: JSON.stringify(safeInput),
      status: IntegrationStatus.CREATED,
    });
  }

  try {
    await integrationLog?.update({ status: IntegrationStatus.PROCESSING });

    const result = await provider.analyse(input);

    await integrationLog?.update({
      output: JSON.stringify(redactSensitive(result)),
      status: IntegrationStatus.COMPLETED,
      // The note carries why a result was inconclusive, which a plain
      // COMPLETED status cannot express on its own.
      note: isInconclusive(result)
        ? `${result.status}: ${result.statusDetail}`
        : result.statusDetail,
    });

    return { result, failed: false };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error(`Correlation processing failed: ${message}`);

    await integrationLog?.update({
      status: IntegrationStatus.ERROR,
      note: message,
    });

    // Returned rather than rethrown so the caller stays in control.
    return { result: null, failed: true, error: message };
  }
};

/**
 * Optional queue wrapper around processCorrelation.
 *
 * Kept separate from the processing function so the logic can be tested
 * without RabbitMQ. Parsing and processing failures are both swallowed and
 * logged, so a bad message can never stall the consumer.
 */
export const handleCorrelationMessage = async (
  rawContent: string,
  options: CorrelationProcessingOptions,
): Promise<CorrelationProcessingOutcome> => {
  let input: CorrelationInput;

  try {
    input = JSON.parse(rawContent) as CorrelationInput;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error(`Correlation message could not be parsed: ${message}`);

    return {
      result: null,
      failed: true,
      error: `Malformed message: ${message}`,
    };
  }

  return processCorrelation(input, options);
};