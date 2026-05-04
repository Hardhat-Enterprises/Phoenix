import { Request, Response } from "express";
import { userGrpcClient } from "../grpc/user.grpc";
import { HttpStatusCode, logger } from "@phoenix/common";

export const getHazards = (req: Request, res: Response) => {
  const { hazard_type, severity_level, event_status, page, limit } = req.query;

  const grpcRequest = {
    hazard_type: (hazard_type as string) || "",
    severity_level: (severity_level as string) || "",
    event_status: (event_status as string) || "",
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 10,
  };

  userGrpcClient.GetHazards(grpcRequest, (error, response) => {
    if (error) {
      logger.error(`Error calling GetHazards: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching hazards" });
    }
    logger.info(`GetHazards response from gRPC: ${JSON.stringify(response)}`);
    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response.status,
      message: response.message,
      hazards: response.hazards,
      total: response.total,
      page: response.page,
      limit: response.limit,
    });
  });
};

export const getHazard = (req: Request, res: Response) => {
  const hazardId = req.params.hazardId as string;

  userGrpcClient.GetHazard({ hazard_event_id: hazardId }, (error, response) => {
    if (error) {
      logger.error(`Error calling GetHazard: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching hazard" });
    }
    logger.info(`GetHazard response from gRPC: ${JSON.stringify(response)}`);
    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response.status,
      message: response.message,
      hazard: response.hazard,
    });
  });
};
