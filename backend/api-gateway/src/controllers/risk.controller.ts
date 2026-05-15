import { Request, Response } from "express";
import { userGrpcClient } from "../grpc/user.grpc";
import { HttpStatusCode, logger } from "@phoenix/common";

export const getRisks = (req: Request, res: Response) => {
  const {
    hazard_id,
    threat_id,
    event_status,
    linked_event_type,
    from,
    to,
    page,
    limit,
  } = req.query;

  const grpcRequest = {
    hazard_id: (hazard_id as string) || "",
    threat_id: (threat_id as string) || "",
    event_status: (event_status as string) || "",
    linked_event_type: (linked_event_type as string) || "",
    from: (from as string) || "",
    to: (to as string) || "",
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 10,
  };

  userGrpcClient.GetRisks(grpcRequest, (error, response) => {
    if (error) {
      logger.error(`Error calling GetRisks: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching risks" });
    }
    logger.info(`Gets response from gRPC: ${JSON.stringify(response)}`);
    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response.status,
      message: response.message,
      risks: response.risks,
      total: response.total,
      page: response.page,
      limit: response.limit,
    });
  });
};

export const getRisk = (req: Request, res: Response) => {
  const riskId = req.params.riskId as string;

  userGrpcClient.GetRisk(
    { integration_event_id: riskId },
    (error, response) => {
      if (error) {
        logger.error(`Error calling GetRisk: ${error}`);
        return res
          .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
          .json({ message: "Error fetching risk" });
      }
      logger.info(`GetRisk response from gRPC: ${JSON.stringify(response)}`);
      return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
        status: response.status,
        message: response.message,
        risk: response.risk,
      });
    },
  );
};
