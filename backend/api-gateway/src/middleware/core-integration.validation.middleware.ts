import { Request, Response, NextFunction } from "express";

export const validateCoreIntegrationPayload = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      status: 400,
      message: "Invalid request payload",
    });
  }

  const requiredFields = [
    "url",
    "text",
    "timestamp",
    "hazard_type",
    "hazard_severity",
    "hazard_timestamp",
    "hazard_location",
    "hazard_status",
    "alert_level",
    "source",
  ];

  const missingFields = requiredFields.filter(
    (field) =>
      body[field] === undefined ||
      body[field] === null ||
      body[field] === "",
  );

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: 400,
      message: "Missing required fields",
      missing_fields: missingFields,
    });
  }

  const stringFields = [
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

  const invalidStringFields = stringFields.filter(
    (field) => typeof body[field] !== "string",
  );

  if (invalidStringFields.length > 0) {
    return res.status(400).json({
      status: 400,
      message: "Invalid field types",
      invalid_fields: invalidStringFields,
    });
  }

  if (
    typeof body.hazard_severity !== "number" ||
    !Number.isFinite(body.hazard_severity)
  ) {
    return res.status(400).json({
      status: 400,
      message: "Invalid field type",
      invalid_fields: ["hazard_severity"],
    });
  }

  next();
};
