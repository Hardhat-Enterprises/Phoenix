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
        .json({ message: "Error fetching user dashboard" });
    }

    logger.info(
      `GetUserDashboard response from gRPC: ${JSON.stringify(response)}`,
    );

    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
      dashboard: {
        total_users: response?.total_users,
        admin_users: response?.admin_users,
        standard_users: response?.standard_users,
      },
    });
  });
};
