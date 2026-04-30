import { Request, response, Response } from "express";
import { userGrpcClient } from "../grpc/user.grpc";
import { HttpStatusCode, logger } from "@phoenix/common";
import { timeStamp } from "console";

export const getHealth = (req: Request, res: Response) => {
  userGrpcClient.GetUserHealth({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetUserHealth: ${error}`);
      res
        .status(
          response.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
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
      res
        .status(
          response.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .json({ message: "Error fetching users" });
    }
    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      message: response?.message,
      user: response?.users,
    });
  });
};

export const getDashboardOverview = (req: Request, res: Response) => {
  try {
    return res
      .status(HttpStatusCode.HTTP_STATUS_OK)
      .json({
        message: "Dashboard overview fetched successfully",
        data: {
          totalUsers: 120,
          activeUsers: 95,
          inactiveUsers: 25,
        },
      });
  } catch (error) {
    logger.error(`Error fetching dashboard overview: ${error}`);
    return res
      .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
      .json({
        message: "Error fetching dashboard overview",
      });
  }
};

export const getDashboardCharts = (req: Request, res: Response) => {
  try {
    return res
      .status(HttpStatusCode.HTTP_STATUS_OK)
      .json({
        message: "Dashboard charts fetched successfully",
        data: {
          usersByMonth: [
            { month: "Jan", count: 10 },
            { month: "Feb", count: 20 },
            { month: "Mar", count: 30 },
          ],
        },
      });
  } catch (error) {
    logger.error(`Error fetching dashboard charts: ${error}`);
    return res
      .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
      .json({
        message: "Error fetching dashboard charts",
      });
  }
};

export const getDashboardActivity = (req: Request, res: Response) => {
  try {
    return res
      .status(HttpStatusCode.HTTP_STATUS_OK)
      .json({
        message: "Dashboard activity fetched successfully",
        data: [
          {
            id: 1,
            action: "User logged in",
            timestamp: new Date(),
          },
          {
            id: 2,
            action: "User viewed dashboard",
            timestamp: new Date(),
          },
        ],
      });
  } catch (error) {
    logger.error(`Error fetching dashboard activity: ${error}`);
    return res
      .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
      .json({
        message: "Error fetching dashboard activity",
      });
  }
};