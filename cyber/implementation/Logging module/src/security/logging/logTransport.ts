/**
 * CY017 — Log transport layer.
 *
 * A transport is responsible only for emitting a finished SecurityLogRecord.
 * The default transport writes newline-delimited JSON (NDJSON) to stdout.
 * Later, the same interface can be implemented by a database writer, SIEM
 * forwarder, Winston/Pino wrapper, or multi-transport fan-out.
 */

import type { SecurityLogRecord } from './securityLogTypes';

export interface LogTransport {
  emit(record: SecurityLogRecord): void;
}

/**
 * Default transport for the current capstone phase.
 *
 * `console.log(JSON.stringify(record))` prints one structured JSON object per
 * line. That is NDJSON: the format is structured JSON, while console.log is
 * only the temporary output method.
 */
export class ConsoleJsonTransport implements LogTransport {
  emit(record: SecurityLogRecord): void {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(record));
  }
}
