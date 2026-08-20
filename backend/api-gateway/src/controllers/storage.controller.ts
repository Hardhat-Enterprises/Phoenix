import { Request, Response } from "express";
import { storageGrpcClient } from "../grpc/storage.grpc";
import { HttpStatusCode } from "@phoenix/common";
import path from "path";

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

export const uploadFile = (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "No file uploaded",
      });
    }

    const filePath = path.resolve(req.file.path);
    storageGrpcClient.UploadFile(
      {
        file_path: filePath,
        original_name: req.file.originalname,
        mime_type:
          req.file.originalname.split(".").pop() || "application/octet-stream",
        size: req.file.size,
      },
      (error: any, response: any) => {
        if (error) {
          return res
            .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
            .json({
              status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
              message: error.message,
              data: [],
            });
        }

        return res
          .status(response?.status || HttpStatusCode.HTTP_STATUS_CREATED)
          .json({
            status: response?.status,
            message: response?.message,
            data: response?.data,
          });
      },
    );
  } catch (error) {
    return res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
      status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: "Error uploading file",
      error: `${error}`,
    });
  }
};
