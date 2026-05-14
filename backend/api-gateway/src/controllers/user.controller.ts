import { Request, Response } from "express";
import { userGrpcClient } from "../grpc/user.grpc";
import { HttpStatusCode, logger } from "@phoenix/common";

const REFRESH_COOKIE_NAME = "refresh_token";

const handleGrpcError = (res: Response, message: string, error: unknown) => {
  logger.error(`${message}: ${error}`);

  return res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
    status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
    message,
    error: `${error}`,
  });
};

export const getHealth = (req: Request, res: Response) => {
  userGrpcClient.GetUserHealth({}, (error: any, response: any) => {
    if (error) {
      return handleGrpcError(res, "Error fetching user health", error);
    }

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      message: response?.message,
    });
  });
};

export const getUser = (req: Request, res: Response) => {
  userGrpcClient.GetUsers({}, (error: any, response: any) => {
    if (error) {
      return handleGrpcError(res, "Error fetching users", error);
    }

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
      user: response?.users,
    });
  });
};

export const getLocations = (req: Request, res: Response) => {
  userGrpcClient.GetLocations({}, (error: any, response: any) => {
    if (error) {
      return handleGrpcError(res, "Error fetching locations", error);
    }

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
      locations: response?.locations,
    });
  });
};

export const register = (req: Request, res: Response) => {
  const { username, password, role } = req.body;

  userGrpcClient.RegisterUser(
    { username, password, role },
    (error, response) => {
      if (error) {
        logger.error(`Error calling RegisterUser: ${error}`);

        return res
          .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
          .json({ message: "Error registering user" });
      }
      if (response?.status === HttpStatusCode.HTTP_STATUS_CREATED) {
        return res
          .status(response?.status || HttpStatusCode.HTTP_STATUS_CREATED)
          .json({
            status: response?.status,
            message: response?.message,
            user_id: response?.user_id,
            username: response?.username,
            role: response?.role,
          });
      } else {
        return res
          .status(response?.status || HttpStatusCode.HTTP_STATUS_BAD_REQUEST)
          .json({
            status: response?.status,
            message: response?.message,
          });
      }
    },
  );
};

export const login = (req: Request, res: Response) => {
  const { username, password } = req.body;

  userGrpcClient.LoginUser({ username, password }, (error, response) => {
    if (error) {
      logger.error(`Error calling LoginUser: ${error}`);

      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error logging in" });
    }

    if (response?.refresh_token) {
      res.cookie(REFRESH_COOKIE_NAME, response.refresh_token, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
      user_id: response?.user_id,
      username: response?.username,
      role: response?.role,
      access_token: response?.access_token,
      refresh_token: response?.refresh_token,
    });
  });
};

export const refresh = (req: Request, res: Response) => {
  const refresh_token = req.cookies?.refresh_token || req.body?.refresh_token;

  if (!refresh_token) {
    return res
      .status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED)
      .json({ message: "No refresh token provided" });
  }

  userGrpcClient.RefreshToken({ refresh_token }, (error, response) => {
    if (error) {
      logger.error(`Error calling RefreshToken: ${error}`);

      return res
        .status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED)
        .json({ message: "Invalid or expired refresh token" });
    }

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
      user_id: response?.user_id,
      username: response?.username,
      role: response?.role,
      access_token: response?.access_token,
      refresh_token: response?.refresh_token,
    });
  });
};

export const logout = (req: Request, res: Response) => {
  const user_id = String(req.params.userId);
  const loggedInUser = (req as any).user;

  if (!loggedInUser || loggedInUser.user_id !== user_id) {
    return res.status(HttpStatusCode.HTTP_STATUS_FORBIDDEN).json({
      message: "You are not authorized to logout this user",
    });
  }

  userGrpcClient.LogoutUser({ user_id }, (error, response) => {
    if (error) {
      logger.error(`Error calling LogoutUser: ${error}`);

      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error logging out" });
    }

    res.clearCookie(REFRESH_COOKIE_NAME);

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
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
            response?.status ||
            HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
          message: "Error fetching dashboard overview",
          data: [],
        });
    }

    logger.info(
      `GetUserDashboard response from gRPC: ${JSON.stringify(response)}`,
    );

    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status || HttpStatusCode.HTTP_STATUS_OK,
      message: response?.message || "Dashboard overview retrieved successfully",

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

export const getEventStatuses = (req: Request, res: Response) => {
  userGrpcClient.GetEventStatuses({}, (error: any, response: any) => {
    if (error) {
      return handleGrpcError(res, "Error fetching event statuses", error);
    }

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
      eventStatuses: response?.eventStatuses,
    });
  });
};

export const getUserDashboardCharts = (req: Request, res: Response) => {
  userGrpcClient.GetUserDashboardCharts({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetUserDashboardCharts: ${error}`);

      return res
        .status(
          response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .json({
          status:
            response?.status ||
            HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
          message: "Error fetching dashboard charts",
          data: [],
        });
    }

    logger.info(
      `GetUserDashboardCharts response from gRPC: ${JSON.stringify(response)}`,
    );

    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status || HttpStatusCode.HTTP_STATUS_OK,
      message: response?.message || "Dashboard charts retrieved successfully",

      data: {
        hazards_by_severity: JSON.parse(response?.hazards_by_severity || "{}"),

        threats_by_risk_level: JSON.parse(
          response?.threats_by_risk_level || "{}",
        ),

        risks_by_level: JSON.parse(response?.risks_by_level || "{}"),

        last_updated: response?.last_updated || new Date().toISOString(),
      },
    });
  });
};

export const getLinkedEventTypes = (req: Request, res: Response) => {
  userGrpcClient.GetLinkedEventTypes({}, (error: any, response: any) => {
    if (error) {
      return handleGrpcError(res, "Error fetching linked event types", error);
    }

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
      linkedEventTypes: response?.linkedEventTypes,
    });
  });
};

export const getUserDashboardActivity = (req: Request, res: Response) => {
  userGrpcClient.GetUserDashboardActivity({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetUserDashboardActivity: ${error}`);

      return res
        .status(
          response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .json({
          status:
            response?.status ||
            HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
          message: "Error fetching dashboard activity",
          data: [],
        });
    }

    logger.info(
      `GetUserDashboardActivity response from gRPC: ${JSON.stringify(response)}`,
    );

    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status || HttpStatusCode.HTTP_STATUS_OK,
      message: response?.message || "Dashboard activity retrieved successfully",

      data: {
        recent_hazards: JSON.parse(response?.recent_hazards || "[]"),

        recent_threats: JSON.parse(response?.recent_threats || "[]"),

        last_updated: response?.last_updated || new Date().toISOString(),
      },
    });
  });
};

export const getSeasons = (req: Request, res: Response) => {
  userGrpcClient.GetSeasons({}, (error: any, response: any) => {
    if (error) {
      return handleGrpcError(res, "Error fetching seasons", error);
    }

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
      seasons: response?.seasons,
    });
  });
};

export const getReferenceDays = (req: Request, res: Response) => {
  userGrpcClient.GetReferenceDays({}, (error: any, response: any) => {
    if (error) {
      return handleGrpcError(res, "Error fetching reference days", error);
    }

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
      referenceDays: response?.referenceDays,
    });
  });
};

export const getReferenceTimes = (req: Request, res: Response) => {
  userGrpcClient.GetReferenceTimes({}, (error: any, response: any) => {
    if (error) {
      return handleGrpcError(res, "Error fetching reference times", error);
    }

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
      referenceTimes: response?.referenceTimes,
    });
  });
};

export const getTrainingModels = (req: Request, res: Response) => {
  userGrpcClient.GetTrainingModels({}, (error: any, response: any) => {
    if (error) {
      return res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
        status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        message: "Error fetching training models",
        error: `${error}`,
      });
    }

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
      models: response?.models || [],
    });
  });
};

export const getOneTrainingModel = (req: Request, res: Response) => {
  const file_id = req.params.file_id as string;

  userGrpcClient.GetOneTrainingModel(
    { file_id },
    (error: any, response: any) => {
      if (error) {
        return res
          .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
          .json({
            status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
            message: "Error fetching training model",
            error: `${error}`,
          });
      }

      return res
        .status(response?.status || HttpStatusCode.HTTP_STATUS_OK)
        .json({
          status: response?.status,
          message: response?.message,
          models: response?.model || null,
        });
    },
  );
};
