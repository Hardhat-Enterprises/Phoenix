import * as winston from "winston";
import { config } from "./config";

// CY017: security records arrive as fully-formed structured objects, flagged
// with a global-registry symbol. They are emitted as NDJSON so they stay
// machine-readable; every other line keeps the existing plaintext format.
const SECURITY_EVENT = Symbol.for("phoenix.security_event");

export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  defaultMeta: { service: config.SERVICE_NAME },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info) => {
      if ((info as Record<symbol, unknown>)[SECURITY_EVENT]) {
        return JSON.stringify(info);
      }

      const { level, message, timestamp, service } = info;
      return `[${timestamp}] [${level}] [${service}]: ${message}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});
