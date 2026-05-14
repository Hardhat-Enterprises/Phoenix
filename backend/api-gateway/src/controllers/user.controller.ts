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

/**
 * BE11.7 — GET /api/users/dashboard/overview
 *
 * Returns a high-level overview of the system dashboard.
 * Response is cached in Redis for 2 minutes (see BE12.3).
 *
 * @route   GET /api/users/dashboard/overview
 * @access  Authenticated users
 *
 * @returns {200} JSON payload with:
 *   - total_hazards          {number} — Total hazard events in the system
 *   - active_hazards         {number} — Hazard events currently marked active
 *   - total_threats          {number} — Total cyber threats in the system
 *   - active_threats         {number} — Cyber threats currently marked active
 *   - total_risk_assessments {number} — Total risk assessments recorded
 *   - critical_risks         {number} — Assessments with confidence >= 0.8
 *   - last_updated           {string} — ISO timestamp of when data was fetched
 *
 * @returns {500} Internal Server Error if the user service is unreachable
 */
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

/**
 * BE11.7 — GET /api/users/dashboard/charts
 *
 * Returns aggregated count data for dashboard charts.
 * Response is cached in Redis for 2 minutes (see BE12.3).
 *
 * @route   GET /api/users/dashboard/charts
 * @access  Authenticated users
 *
 * @returns {200} JSON payload with:
 *   - hazards_by_severity   {object} — Hazard counts keyed by severity level (low/medium/high/critical)
 *   - threats_by_risk_level {object} — Threat counts keyed by risk level (low/medium/high/critical)
 *   - risks_by_level        {object} — Risk assessment counts keyed by confidence band
 *   - last_updated          {string} — ISO timestamp of when data was fetched
 *
 * @returns {500} Internal Server Error if the user service is unreachable
 */
export const getUserDashboardCharts = (
  req: Request,
  res: Response,
) => {
  userGrpcClient.GetUserDashboardCharts({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetUserDashboardCharts: ${error}`);

      return res
        .status(
          response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .json({
          status:
            response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
          message: "Error fetching dashboard charts",
          data: [],
        });
    }

    logger.info(
      `GetUserDashboardCharts response from gRPC: ${JSON.stringify(response)}`,
    );

    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status || HttpStatusCode.HTTP_STATUS_OK,
      message:
        response?.message || "Dashboard charts retrieved successfully",

      data: {
        hazards_by_severity: JSON.parse(
          response?.hazards_by_severity || "{}",
        ),

        threats_by_risk_level: JSON.parse(
          response?.threats_by_risk_level || "{}",
        ),

        risks_by_level: JSON.parse(response?.risks_by_level || "{}"),

        last_updated:
          response?.last_updated || new Date().toISOString(),
      },
    });
  });
};

/**
 * BE11.7 — GET /api/users/dashboard/activity
 *
 * Returns the 5 most recent hazard events and cyber threats for the activity feed.
 * Response is cached in Redis for 2 minutes (see BE12.3).
 *
 * @route   GET /api/users/dashboard/activity
 * @access  Authenticated users
 *
 * @returns {200} JSON payload with:
 *   - recent_hazards {Array} — 5 most recent hazard events ordered by created_at DESC
 *   - recent_threats {Array} — 5 most recent cyber threats ordered by created_at DESC
 *   - last_updated   {string} — ISO timestamp of when data was fetched
 *
 * @returns {500} Internal Server Error if the user service is unreachable
 */
export const getUserDashboardActivity = (
  req: Request,
  res: Response,
) => {
  userGrpcClient.GetUserDashboardActivity({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetUserDashboardActivity: ${error}`);

      return res
        .status(
          response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .json({
          status:
            response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
          message: "Error fetching dashboard activity",
          data: [],
        });
    }

    logger.info(
      `GetUserDashboardActivity response from gRPC: ${JSON.stringify(response)}`,
    );

    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status || HttpStatusCode.HTTP_STATUS_OK,
      message:
        response?.message || "Dashboard activity retrieved successfully",

      data: {
        recent_hazards: JSON.parse(
          response?.recent_hazards || "[]",
        ),

        recent_threats: JSON.parse(
          response?.recent_threats || "[]",
        ),

        last_updated:
          response?.last_updated || new Date().toISOString(),
      },
    });
  });
};
