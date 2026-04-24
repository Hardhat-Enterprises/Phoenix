import { Request, Response } from "express";
import { ingestionGrpcClient } from "../grpc/ingestion.grpc";
import { HttpStatusCode, logger } from "@phoenix/common";

export const getHealth = (_req: Request, res: Response): void => {
  ingestionGrpcClient.GetIngestionHealth({}, (error: any, response: any) => {
    if (error) {
      logger.error(`Error calling GetIngestionHealth: ${error}`);
      res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching ingestion service health" });
      return;
    }

    res
      .status(response?.status || HttpStatusCode.HTTP_STATUS_OK)
      .json({ message: response?.message });
  });
};

export const ingestData = (req: Request, res: Response): void => {
  ingestionGrpcClient.IngestData(req.body, (error: any, response: any) => {
    if (error) {
      logger.error(`Error calling IngestData: ${error}`);
      res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error ingesting data" });
      return;
    }

    res
      .status(response?.status || HttpStatusCode.HTTP_STATUS_OK)
      .json(response);
  });
};

export const createHazard = (req: Request, res: Response): void => {
  ingestionGrpcClient.CreateHazardData(req.body, (error: any, response: any) => {
    if (error) {
      logger.error(`Error calling CreateHazardData: ${error}`);
      res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error creating hazard data" });
      return;
    }

    res
      .status(response?.status || HttpStatusCode.HTTP_STATUS_OK)
      .json(response);
  });
};