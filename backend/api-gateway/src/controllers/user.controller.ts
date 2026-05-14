import { Request, Response } from "express";
import { userGrpcClient } from "../grpc/user.grpc";
import { HttpStatusCode, logger } from "@phoenix/common";

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
