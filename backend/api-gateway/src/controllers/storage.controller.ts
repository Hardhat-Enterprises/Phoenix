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
        // Sprint 2 Week 3 (Varun) — this previously read
        // req.file.originalname.split(".").pop(), which stores the file
        // EXTENSION (e.g. "pdf") as the mime_type instead of the real MIME
        // type (e.g. "application/pdf"). multer already parses the real
        // MIME type onto req.file.mimetype — use that instead.
        mime_type: req.file.mimetype || "application/octet-stream",
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

        // Sprint 2 Week 3 (Varun) — pass the new metadata fields through so
        // the frontend receives something it can actually store/reference,
        // instead of only { status, message }.
        return res
          .status(response?.status || HttpStatusCode.HTTP_STATUS_CREATED)
          .json({
            status: response?.status,
            message: response?.message,
            data: {
              file_id: response?.file_id,
              original_name: response?.original_name,
              mime_type: response?.mime_type,
              size: response?.size,
            },
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
