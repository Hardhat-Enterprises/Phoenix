import { NextFunction, Request, Response } from "express";
import { HttpStatusCode } from "@phoenix/common";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isValidDateString = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

const sendValidationError = (
  res: Response,
  errors: string[],
): Response => {
  return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
    status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
    message: "Invalid request payload",
    errors,
  });
};

export const validateHazardIngestion = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    sendValidationError(res, ["Request body must be a JSON object"]);
    return;
  }

  const errors: string[] = [];

  if (!isNonEmptyString(body.url)) {
    errors.push("url must be a non-empty string");
  }

  if (!isNonEmptyString(body.text)) {
    errors.push("text must be a non-empty string");
  }

  if (!isValidDateString(body.timestamp)) {
    errors.push("timestamp must be a valid date-time string");
  }

  if (!isNonEmptyString(body.hazard_type)) {
    errors.push("hazard_type must be a non-empty string");
  }

  if (typeof body.hazard_severity !== "number" ||
      !Number.isFinite(body.hazard_severity)) {
    errors.push("hazard_severity must be a valid number");
  }

  if (!isValidDateString(body.hazard_timestamp)) {
    errors.push("hazard_timestamp must be a valid date-time string");
  }

  if (!isNonEmptyString(body.hazard_location)) {
    errors.push("hazard_location must be a non-empty string");
  }

  if (!isNonEmptyString(body.hazard_status)) {
    errors.push("hazard_status must be a non-empty string");
  }

  if (!isNonEmptyString(body.alert_level)) {
    errors.push("alert_level must be a non-empty string");
  }

  if (!isNonEmptyString(body.source)) {
    errors.push("source must be a non-empty string");
  }

  if (errors.length > 0) {
    sendValidationError(res, errors);
    return;
  }

  next();
};

export const validateCyberIngestion = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    sendValidationError(res, ["Request body must be a JSON object"]);
    return;
  }

  const errors: string[] = [];

  if (!isNonEmptyString(body.event_id)) {
    errors.push("event_id must be a non-empty string");
  }

  if (!isValidDateString(body.timestamp)) {
    errors.push("timestamp must be a valid date-time string");
  }

  if (body.event_type !== "cyber") {
    errors.push('event_type must be "cyber"');
  }

  if (!isNonEmptyString(body.source)) {
    errors.push("source must be a non-empty string");
  }

  if (!isNonEmptyString(body.threat_type)) {
    errors.push("threat_type must be a non-empty string");
  }

  const validSeverities = ["low", "medium", "high", "critical"];

  if (
    typeof body.severity !== "string" ||
    !validSeverities.includes(body.severity)
  ) {
    errors.push(
      "severity must be one of: low, medium, high, critical",
    );
  }

  if (
    typeof body.confidence_score !== "number" ||
    !Number.isFinite(body.confidence_score)
  ) {
    errors.push("confidence_score must be a valid number");
  }

  if (!isNonEmptyString(body.details)) {
    errors.push("details must be a non-empty string");
  }

  if (errors.length > 0) {
    sendValidationError(res, errors);
    return;
  }

  next();
};