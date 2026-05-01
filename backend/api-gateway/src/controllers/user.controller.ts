import { Request, Response } from "express";
import { userGrpcClient } from "../grpc/user.grpc";
import { HttpStatusCode, logger } from "@phoenix/common";

export const getHealth = (req: Request, res: Response) => {
  userGrpcClient.GetUserHealth({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetUserHealth: ${error}`);
      return res
        .status(
          response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .json({ message: "Error fetching user health" });
    }

    return res
      .status(response.status || HttpStatusCode.HTTP_STATUS_OK)
      .json({ message: response?.message });
  });
};

export const getUser = (req: Request, res: Response) => {
  userGrpcClient.GetUsers({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetUsers: ${error}`);

      return res
        .status(
          response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .json({ message: "Error fetching users" });
    }

    logger.info(`GetUsers response from gRPC: ${JSON.stringify(response)}`);

    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
      user: response?.users,
    });
  });
};

export const getUserDashboard = (req: Request, res: Response) => {
  userGrpcClient.GetUserDashboard({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetUserDashboard: ${error}`);

      return res
        .status(
          response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .json({
          status:
            response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
          message: "Error fetching dashboard overview",
          data: [],
        });
    }

    logger.info(
      `GetUserDashboard response from gRPC: ${JSON.stringify(response)}`,
    );

    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status || HttpStatusCode.HTTP_STATUS_OK,
      message:
        response?.message || "Dashboard overview retrieved successfully",
      data: [
        {
          total_hazards: response?.total_hazards,
          active_hazards: response?.active_hazards,
          total_threats: response?.total_threats,
          active_threats: response?.active_threats,
          total_risk_assessments: response?.total_risk_assessments,
          critical_risks: response?.critical_risks,
          last_updated: response?.last_updated || new Date().toISOString(),
        },
      ],
    });
  });
};
