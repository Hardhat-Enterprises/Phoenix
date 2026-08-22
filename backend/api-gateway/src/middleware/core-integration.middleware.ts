import { CoreModelIntegrationPayload, HttpStatusCode } from "@phoenix/common";
import { NextFunction, Request, Response } from "express";

const REQUIRED_STRING_FIELDS: (keyof CoreModelIntegrationPayload)[] = [
  "url",
  "text",
  "timestamp",
  "hazard_type",
  "hazard_timestamp",
  "hazard_location",
  "hazard_status",
  "alert_level",
  "source",
];

const MAX_LENGTHS: Partial<Record<keyof CoreModelIntegrationPayload, number>> = {
  url: 2048,
  text: 10000,
  hazard_type: 100,
  hazard_location: 200,
  hazard_status: 50,
  alert_level: 50,
  source: 200,
};

const isIsoDate = (value: string): boolean =>
  Number.isFinite(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}T/.test(value);

export const validateCoreIntegrationPayload = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const payload = req.body as Partial<CoreModelIntegrationPayload>;
  const errors: string[] = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: "Request body must be a JSON object",
    });
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    const value = payload[field];

    if (typeof value !== "string" || !value.trim()) {
      errors.push(`${field} is required and must be a non-empty string`);
      continue;
    }

    const maxLength = MAX_LENGTHS[field];
    if (maxLength && value.length > maxLength) {
      errors.push(`${field} must not exceed ${maxLength} characters`);
    }
  }

  if (typeof payload.url === "string") {
    try {
      const url = new URL(payload.url);
      if (!(["http:", "https:"] as string[]).includes(url.protocol)) {
        errors.push("url must use http or https");
      }
    } catch {
      errors.push("url must be valid");
    }
  }

  if (
    typeof payload.timestamp === "string" &&
    !isIsoDate(payload.timestamp)
  ) {
    errors.push("timestamp must be an ISO 8601 date-time");
  }

  if (
    typeof payload.hazard_timestamp === "string" &&
    !isIsoDate(payload.hazard_timestamp)
  ) {
    errors.push("hazard_timestamp must be an ISO 8601 date-time");
  }

  const hazardSeverity = Number(payload.hazard_severity);
  if (
    !Number.isFinite(hazardSeverity) ||
    hazardSeverity < 0 ||
    hazardSeverity > 1
  ) {
    errors.push("hazard_severity must be a number between 0 and 1");
  }

  if (errors.length > 0) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: "Invalid ADCRS integration payload",
      errors,
    });
  }

  next();
};
