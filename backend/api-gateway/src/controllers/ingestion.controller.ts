import { Request, Response } from "express";
import { ingestionGrpcClient } from "../grpc/ingestion.grpc";
import {
  DataStreamEventType,
  DataStreamRequest,
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

export const ingestData = async (req: Request, res: Response) => {
  try {
    const channel = getChannel();
    const body = req.body as DataStreamRequest;

    await Promise.all([
      channel.assertQueue(RabbitMQQueueType.HAZARD_CREATION_QUEUE, {
        durable: true,
      }),
      channel.assertQueue(RabbitMQQueueType.CYBER_CREATION_QUEUE, {
        durable: true,
      }),
    ]);
    switch (body.event_type) {
      case DataStreamEventType.HAZARD_ONLY:
        channel.sendToQueue(
          RabbitMQQueueType.HAZARD_CREATION_QUEUE,
          Buffer.from(JSON.stringify(body)),
          {
            persistent: true,
          },
        );
        break;
      case DataStreamEventType.CYBER_ONLY:
        channel.sendToQueue(
          RabbitMQQueueType.CYBER_CREATION_QUEUE,
          Buffer.from(JSON.stringify(body)),
          {
            persistent: true,
          },
        );
        break;
      case DataStreamEventType.COMBINED_CORRELATION:
        channel.sendToQueue(
          RabbitMQQueueType.HAZARD_CREATION_QUEUE,
          Buffer.from(JSON.stringify(body)),
          {
            persistent: true,
          },
        );
        channel.sendToQueue(
          RabbitMQQueueType.CYBER_CREATION_QUEUE,
          Buffer.from(JSON.stringify(body)),
          {
            persistent: true,
          },
        );
        break;
      default:
        break;
    }
    res.status(HttpStatusCode.HTTP_STATUS_ACCEPTED).json({
      status: HttpStatusCode.HTTP_STATUS_ACCEPTED,
      message: "Data ingested successfully",
    });
  } catch (error) {
    logger.error(`Error ingesting data: ${error}`);
    res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
      status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: "Error ingesting data",
    });
  }
};
