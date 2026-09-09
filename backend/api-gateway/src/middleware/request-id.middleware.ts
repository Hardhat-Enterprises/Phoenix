/**
 * CY017 — Correlation ID middleware.
 *
 * Assigns one identifier per incoming HTTP request so that every security log
 * record produced while handling that request can be tied back to it. Without
 * this, `request_id` only appears when a caller happens to send the header,
 * which makes it useless for correlation.
 *
 * The central security logging module's `fromRequest()` already reads `x-request-id`, so this middleware
 * writes back into `req.headers` rather than inventing a new property — the
 * logging module needs no change.
 */

import { randomUUID } from "node:crypto";
import { Request, Response, NextFunction } from "express";

const HEADER = "x-request-id";

/**
 * A caller-supplied ID is accepted only if it is short and alphanumeric. 
 */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

const isSafeRequestId = (value?: string): value is string =>
  typeof value === "string" && SAFE_REQUEST_ID.test(value);

export const attachRequestId = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const incoming = req.headers[HEADER];
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;

  // Honour a valid caller-supplied ID so a future frontend or gateway can pass
  // a trace ID through; otherwise mint one.
  const requestId = isSafeRequestId(candidate) ? candidate : randomUUID();

  req.headers[HEADER] = requestId;
  res.setHeader(HEADER, requestId);

  next();
};
