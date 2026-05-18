import { Request, Response } from "express";
import { ingestionGrpcClient } from "../grpc/ingestion.grpc";
import {
  CoreModelIntegrationPayload,
  getChannel,
  HttpStatusCode,
  logger,
  RabbitMQQueueType,
} from "@phoenix/common";

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
    const body = req.body as CoreModelIntegrationPayload;
    logger.info(
      "Received core model integration request:",
      body || "No body provided",
    );

    await channel.assertQueue(RabbitMQQueueType.CORE_MODEL_INTEGRATION_QUEUE);
    channel.sendToQueue(
      RabbitMQQueueType.CORE_MODEL_INTEGRATION_QUEUE,
      Buffer.from(JSON.stringify(body)),
      {
        persistent: true,
      },
    );
    res.status(HttpStatusCode.HTTP_STATUS_ACCEPTED).json({
      status: HttpStatusCode.HTTP_STATUS_ACCEPTED,
      message: "Core model integration data sent successfully",
    });
  } catch (error) {
    logger.error(`Error integrating core model: ${error}`);
    res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
      status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: "Error integrating core model",
    });
  }
};
