import { Request, Response } from "express";
import { userGrpcClient } from "../grpc/user.grpc";
import { HttpStatusCode, logger, redisClient } from "@phoenix/common";

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

    userGrpcClient.GetEventStatuses(
      {},
      async (error: any, response: any) => {
        if (error) {
          return handleGrpcError(
            res,
            "Error fetching event statuses",
            error
          );
        }

        const result = {
          status: response?.status,
          message: response?.message,
          eventStatuses: response?.eventStatuses,
        };

        await redisClient.set(
          cacheKey,
          JSON.stringify(result),
          "EX",
          120
        );

        return res
          .status(response?.status || HttpStatusCode.HTTP_STATUS_OK)
          .json({
            ...result,
            cached: false,
          });
      }
    );
  } catch (error) {
    return handleGrpcError(
      res,
      "Error fetching event statuses",
      error
    );
  }
};

export const getLinkedEventTypes = async (
  req: Request,
  res: Response
) => {
  const cacheKey = "meta:linked-event-types";

  try {
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
        ...JSON.parse(cachedData),
        cached: true,
      });
    }

    userGrpcClient.GetLinkedEventTypes(
      {},
      async (error: any, response: any) => {
        if (error) {
          return handleGrpcError(
            res,
            "Error fetching linked event types",
            error
          );
        }

        const result = {
          status: response?.status,
          message: response?.message,
          linkedEventTypes: response?.linkedEventTypes,
        };

        await redisClient.set(
          cacheKey,
          JSON.stringify(result),
          "EX",
          120
        );

        return res
          .status(response?.status || HttpStatusCode.HTTP_STATUS_OK)
          .json({
            ...result,
            cached: false,
          });
      }
    );
  } catch (error) {
    return handleGrpcError(
      res,
      "Error fetching linked event types",
      error
    );
  }
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