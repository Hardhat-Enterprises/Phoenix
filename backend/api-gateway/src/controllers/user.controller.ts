import { Request, Response } from "express";
import { userGrpcClient } from "../grpc/user.grpc";
import { HttpStatusCode, logger, redisClient } from "@phoenix/common";

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

export const register = (req: Request, res: Response) => {
  const { username, password, role } = req.body;

  userGrpcClient.RegisterUser(
    { username, password, role },
    (error: any, response: any) => {
      if (error) {
        return handleGrpcError(res, "Error registering user", error);
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
      }

      return res
        .status(response?.status || HttpStatusCode.HTTP_STATUS_BAD_REQUEST)
        .json({
          status: response?.status,
          message: response?.message,
        });
    },
  );
};

export const login = (req: Request, res: Response) => {
  const { username, password } = req.body;

  userGrpcClient.LoginUser(
    { username, password },
    (error: any, response: any) => {
      if (error) {
        return handleGrpcError(res, "Error logging in", error);
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
    },
  );
};

export const refresh = (req: Request, res: Response) => {
  const refresh_token = req.cookies?.refresh_token || req.body?.refresh_token;

  if (!refresh_token) {
    return res
      .status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED)
      .json({ message: "No refresh token provided" });
  }

  userGrpcClient.RefreshToken(
    { refresh_token },
    (error: any, response: any) => {
      if (error) {
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
    },
  );
};

export const logout = (req: Request, res: Response) => {
  const user_id = String(req.params.userId);
  const loggedInUser = (req as any).user;

  if (!loggedInUser || loggedInUser.user_id !== user_id) {
    return res.status(HttpStatusCode.HTTP_STATUS_FORBIDDEN).json({
      message: "You are not authorized to logout this user",
    });
  }

  userGrpcClient.LogoutUser({ user_id }, (error: any, response: any) => {
    if (error) {
      return handleGrpcError(res, "Error logging out", error);
    }

    res.clearCookie(REFRESH_COOKIE_NAME);

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
    });
  });
};

export const getLocations = async (req: Request, res: Response) => {
  const cacheKey = "meta:locations";

  try {
    const cachedLocations = await redisClient.get(cacheKey);

    if (cachedLocations) {
      return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
        ...JSON.parse(cachedLocations),
        cached: true,
      });
    }

    userGrpcClient.GetLocations({}, async (error: any, response: any) => {
      if (error) {
        return handleGrpcError(res, "Error fetching locations", error);
      }

      const result = {
        status: response?.status,
        message: response?.message,
        locations: response?.locations,
      };

      await redisClient.set(cacheKey, JSON.stringify(result), "EX", 120);

      return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
        ...result,
        cached: false,
      });
    });
  } catch (error) {
    return handleGrpcError(res, "Error fetching locations", error);
  }
};

export const getEventStatuses = async (req: Request, res: Response) => {
  const cacheKey = "meta:event-statuses";

  try {
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
        ...JSON.parse(cachedData),
        cached: true,
      });
    }

    userGrpcClient.GetEventStatuses({}, async (error: any, response: any) => {
      if (error) {
        return handleGrpcError(res, "Error fetching event statuses", error);
      }

      const result = {
        status: response?.status,
        message: response?.message,
        eventStatuses: response?.eventStatuses,
      };

      await redisClient.set(cacheKey, JSON.stringify(result), "EX", 120);

      return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
        ...result,
        cached: false,
      });
    });
  } catch (error) {
    return handleGrpcError(res, "Error fetching event statuses", error);
  }
};

export const getLinkedEventTypes = async (req: Request, res: Response) => {
  const cacheKey = "meta:linked-event-types";

  try {
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
        ...JSON.parse(cachedData),
        cached: true,
      });
    }

    userGrpcClient.GetLinkedEventTypes({}, async (error: any, response: any) => {
      if (error) {
        return handleGrpcError(res, "Error fetching linked event types", error);
      }

      const result = {
        status: response?.status,
        message: response?.message,
        linkedEventTypes: response?.linkedEventTypes,
      };

      await redisClient.set(cacheKey, JSON.stringify(result), "EX", 120);

      return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
        ...result,
        cached: false,
      });
    });
  } catch (error) {
    return handleGrpcError(res, "Error fetching linked event types", error);
  }
};

export const getUserDashboard = (req: Request, res: Response) => {
  userGrpcClient.GetUserDashboard({}, (error: any, response: any) => {
    if (error) {
      return res
        .status(response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({
          status:
            response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
          message: "Error fetching dashboard overview",
          data: [],
        });
    }

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status || HttpStatusCode.HTTP_STATUS_OK,
      message: response?.message || "Dashboard overview retrieved successfully",
      data: [
        {
          total_hazards: response?.total_hazards,
          critical_hazards: response?.critical_hazards,
          total_threats: response?.total_threats,
          active_threats: response?.active_threats,
          total_ingestions: response?.total_ingestions,
          last_updated: response?.last_updated || new Date().toISOString(),
        },
      ],
    });
  });
};

export const getUserDashboardCharts = (req: Request, res: Response) => {
  userGrpcClient.GetUserDashboardCharts({}, (error: any, response: any) => {
    if (error) {
      return res
        .status(response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({
          status:
            response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
          message: "Error fetching dashboard charts",
          data: [],
        });
    }

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status || HttpStatusCode.HTTP_STATUS_OK,
      message: response?.message || "Dashboard charts retrieved successfully",
      data: {
        hazards_by_severity: JSON.parse(response?.hazards_by_severity || "{}"),
        threats_by_risk_level: JSON.parse(
          response?.threats_by_risk_level || "{}",
        ),
        last_updated: response?.last_updated || new Date().toISOString(),
      },
    });
  });
};

export const getUserDashboardActivity = (req: Request, res: Response) => {
  userGrpcClient.GetUserDashboardActivity({}, (error: any, response: any) => {
    if (error) {
      return res
        .status(response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({
          status:
            response?.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
          message: "Error fetching dashboard activity",
          data: [],
        });
    }

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
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