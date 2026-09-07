import { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { ingestionGrpcClient } from "../grpc/ingestion.grpc";
import {
  CoreModelInputData,
  CoreModelIntegrationPayload,
  getChannel,
  HttpStatusCode,
  logger,
  RabbitMQQueueType,
} from "@phoenix/common";

const PROHIBITED_CORE_MODEL_FIELDS = [
  "alert_level",
  "hazard_severity",
  "severity",
  "duration_hours",
  "disaster_severity_score",
  "event_intensity_index",
  "hazard_normalized",
  "severity_change_rate",
  "hazard_trend_index",
  "severity_volatility",
  "multi_event_overlap_flag",
  "geo_risk_zone_score",
  "combined_risk_index",
  "adaptive_risk_index",
] as const;
const REQUIRED_M7_FIELDS = [
  "text",
  "hazard_type",
  "hazard_location",
  "hazard_status",
  "source",
] as const;
const validateCoreModelInput = (body: unknown): string | null => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }
  const rawInput = body as Record<string, unknown>;
  const prohibitedFields = PROHIBITED_CORE_MODEL_FIELDS.filter(
    (field) => field in rawInput,
  );

  if (prohibitedFields.length > 0) {
    return `Prohibited prediction fields are not allowed: ${prohibitedFields.join(
      ", ",
    )}.`;
  }
  const missingFields = REQUIRED_M7_FIELDS.filter((field) => {
    const value = rawInput[field];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missingFields.length > 0) {
    return `Missing required prediction fields: ${missingFields.join(", ")}.`;
  }

  const input = body as CoreModelInputData;
  const text = typeof input.text === "string" ? input.text.trim() : "";
  const url = typeof input.url === "string" ? input.url.trim() : "";


  if (text.length > 5000) {
    return "text must not exceed 5000 characters.";
  }

  if (url.length > 2048) {
    return "url must not exceed 2048 characters.";
  }

  if (url) {
    try {
      const parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return "url must use the http or https scheme.";
      }
    } catch {
      return "url must be a valid absolute URL.";
    }
  }

  return null;
};

export const getHealth = (_req: Request, res: Response): void => {
  ingestionGrpcClient.GetIngestionHealth({}, (error: any, response: any) => {
    if (error) {
      logger.error(`Error calling GetIngestionHealth: ${error}`);
      res
        .status(
          response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .json({
          status:
            response?.status ||
            HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
          message: "Error fetching ingestion service health",
        });
      return;
    }

    res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status || HttpStatusCode.HTTP_STATUS_OK,
      message: response?.message,
    });
  });
};

export const ingestHazardData = async (req: Request, res: Response) => {
  try {
    const channel = getChannel();
    const body = req.body as any;

    await channel.assertQueue(RabbitMQQueueType.HAZARD_CREATION_QUEUE, {
      durable: true,
    });

    channel.sendToQueue(
      RabbitMQQueueType.HAZARD_CREATION_QUEUE,
      Buffer.from(JSON.stringify(body)),
      {
        persistent: true,
      },
    );
    res.status(HttpStatusCode.HTTP_STATUS_ACCEPTED).json({
      status: HttpStatusCode.HTTP_STATUS_ACCEPTED,
      message: "Hazard data ingested successfully",
    });
  } catch (error) {
    logger.error(`Error ingesting hazard data: ${error}`);
    res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
      status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: "Error ingesting hazard data",
    });
  }
};

export const ingestCyberData = async (req: Request, res: Response) => {
  try {
    const channel = getChannel();
    const body = req.body as any;

    (await channel.assertQueue(RabbitMQQueueType.CYBER_CREATION_QUEUE, {
      durable: true,
    }),
      channel.sendToQueue(
        RabbitMQQueueType.CYBER_CREATION_QUEUE,
        Buffer.from(JSON.stringify(body)),
        {
          persistent: true,
        },
      ));
    res.status(HttpStatusCode.HTTP_STATUS_ACCEPTED).json({
      status: HttpStatusCode.HTTP_STATUS_ACCEPTED,
      message: "Cyber data ingested successfully",
    });
  } catch (error) {
    logger.error(`Error ingesting cyber data: ${error}`);
    res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
      status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: "Error ingesting cyber data",
    });
  }
};

export const coreModelIntegration = async (req: Request, res: Response) => {
  try {
    const channel = getChannel();
    const body = req.body as CoreModelInputData;
    const validationError = validateCoreModelInput(body);

    if (validationError) {
      res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        error: {
          code: "INVALID_REQUEST",
          message: validationError,
          request_id: null,
        },
      });
      return;
    }

    const requestId = randomUUID();
    const acceptedAt = new Date().toISOString();
    const queuePayload: CoreModelIntegrationPayload = {
      integration_event_id: requestId,
      input_data: body,
      accepted_at: acceptedAt,
    };

    logger.info(`Accepted core model integration request ${requestId}`);

    await channel.assertQueue(RabbitMQQueueType.CORE_MODEL_INTEGRATION_QUEUE, {
      durable: true,
    });
    channel.sendToQueue(
      RabbitMQQueueType.CORE_MODEL_INTEGRATION_QUEUE,
      Buffer.from(JSON.stringify(queuePayload)),
      {
        persistent: true,
      },
    );
    res.status(HttpStatusCode.HTTP_STATUS_ACCEPTED).json({
      status: HttpStatusCode.HTTP_STATUS_ACCEPTED,
      message: "Core model analysis accepted",
      data: {
        request_id: requestId,
        integration_event_id: requestId,
        status: "created",
        status_url: `/api/users/integration/${requestId}`,
        accepted_at: acceptedAt,
      },
    });
  } catch (error) {
    logger.error(`Error integrating core model: ${error}`);
    res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
      status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: "Error integrating core model",
    });
  }
};
