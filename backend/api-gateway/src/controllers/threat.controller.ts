import { Request, Response } from "express";
import { userGrpcClient } from "../grpc/user.grpc";
import { HttpStatusCode, logger } from "@phoenix/common";

export const getThreats = (req: Request, res: Response) => {
  const { threat_type, risk_level, status, page, limit } = req.query;

  const grpcRequest = {
    threat_type: (threat_type as string) || "",
    risk_level: (risk_level as string) || "",
    status: (status as string) || "",
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 10,
  };

  userGrpcClient.GetThreats(grpcRequest, (error, response) => {
    if (error) {
      logger.error(`Error calling GetThreats: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching threats" });
    }
    logger.info(`GetThreats response from gRPC: ${JSON.stringify(response)}`);
    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response.status,
      message: response.message,
      threats: response.threats,
      total: response.total,
      page: response.page,
      limit: response.limit,
    });
  });
};

export const getThreat = (req: Request, res: Response) => {
  const threatId = req.params.threatId as string;

  userGrpcClient.GetThreat({ threat_id: threatId }, (error, response) => {
    if (error) {
      logger.error(`Error calling GetThreat: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching threat" });
    }
    logger.info(`GetThreat response from gRPC: ${JSON.stringify(response)}`);
    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response.status,
      message: response.message,
      threat: response.threat,
    });
  });
};
