import { Request, Response } from "express";
import { storageGrpcClient } from "../grpc/storage.grpc";
import { HttpStatusCode } from "@phoenix/common";

export const getHealth = (req: Request, res: Response) => {
  storageGrpcClient.GetStorageHealth({}, (error: any, response: any) => {
    if (error) {
      return res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
        status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        message: "Error fetching storage health",
        error: `${error}`,
      });
    }

    return res.status(response?.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
    });
  });
};
