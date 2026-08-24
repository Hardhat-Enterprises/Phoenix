/**
 * CY017 — Winston transport.
 *
 * Routes security records through the shared Winston logger so the team has one
 * place to add persistence (File, HTTP or SIEM transports) covering both
 * operational and security output.
 *
 * The record's fields are spread into Winston's info object rather than nested,
 * so a future SIEM transport can index `event_type`, `user_id` and `severity`
 * as top-level fields instead of digging into a nested blob.
 *
 * `Symbol.for()` uses the global symbol registry, so this file and logger.ts
 * obtain the identical symbol without importing each other -- which avoids a
 * circular dependency. Symbol keys are ignored by JSON.stringify, so the marker
 * routes the record without appearing in the output.
 */

import { logger } from "../config/logger";
import type { LogTransport } from "./logTransport";
import type { SecurityLogRecord, SecuritySeverity } from "./securityLogTypes";

export const SECURITY_EVENT = Symbol.for("phoenix.security_event");

/**
 * Domain severity -> Winston level. Both are kept in the record: `level` drives
 * Winston's filtering and routing, `severity` remains the security
 * classification.
 */
const toWinstonLevel = (severity: SecuritySeverity): string => {
  switch (severity) {
    case "critical":
    case "high":
      return "error";
    case "medium":
      return "warn";
    default:
      return "info";
  }
};

/**
 * Render a leaf value. No quotes are emitted, so nothing needs escaping when
 * the message is later serialised inside the JSON record.
 */
const formatScalar = (value: unknown): string => {
  if (value === null) return "null";
  if (value === "") return '""';
  return String(value);
};

/**
 * Flatten details into `key=value` pairs, using dotted keys for nested objects
 * and indexed keys for arrays of objects.
 *
 * Recursion is bounded: sanitiseDetails() has already capped depth and replaced
 * circular references before any transport sees the details.
 */
const flattenDetails = (
  value: unknown,
  prefix: string,
  out: string[],
): string[] => {
  if (value === undefined) return out;

  if (Array.isArray(value)) {
    const allScalar = value.every((i) => i === null || typeof i !== "object");
    if (allScalar) {
      out.push(`${prefix}=${value.map(formatScalar).join(",") || "[]"}`);
    } else {
      value.forEach((item, i) => flattenDetails(item, `${prefix}.${i}`, out));
    }
    return out;
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      out.push(`${prefix}={}`);
      return out;
    }
    for (const [key, child] of entries) {
      flattenDetails(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }

  out.push(`${prefix}=${formatScalar(value)}`);
  return out;
};

/**
 * Human-readable summary: event type, reason, and details as key=value pairs.
 *
 * Details are flattened rather than JSON-stringified because a JSON string
 * nested inside a JSON record escapes every quote, which is unreadable in raw
 * output. The structured `details` object remains in the record, so this is a
 * friendlier rendering of data that is still available in full.
 *
 * `details` is sanitised by logSecurityEvent before reaching any transport, so
 * nothing sensitive can leak through this string.
 */
const buildMessage = (record: SecurityLogRecord): string => {
  const parts: string[] = [record.event_type];

  if (record.reason) parts.push(record.reason);

  if (typeof record.details === "string") {
    parts.push(record.details);
  } else if (record.details !== undefined) {
    const pairs = flattenDetails(record.details, "", []).join(" ");
    if (pairs) parts.push(pairs);
  }

  return parts.join(" | ");
};

export class WinstonTransport implements LogTransport {
  emit(record: SecurityLogRecord): void {
    // The three-argument form is required, not cosmetic: winston merges as
    // Object.assign({}, defaultMeta, meta, ...) here, so our fields win. The
    // single-object form applies defaultMeta *last* and would overwrite them.
    logger.log(toWinstonLevel(record.severity), buildMessage(record), {
      [SECURITY_EVENT]: true,
      // Drop winston's defaultMeta service name for security lines; `component`
      // carries the service identity. JSON.stringify omits undefined values.
      service: undefined,
      ...record,
    });
  }
}
