import { sendUnaryData, ServerUnaryCall } from "@grpc/grpc-js";
import { logger } from "@phoenix/common";
import { GetHealthDto, UploadFileDto } from "../dto/storage.dto";
import { GetHealthEntity, UploadFileEntity } from "../entity/storage.entity";
import { getHealth, uploadFile } from "../services/storage.service";

export const storageHandler = {
  GetStorageHealth: (
    call: ServerUnaryCall<GetHealthDto, GetHealthEntity>,
    callback: sendUnaryData<GetHealthEntity>,
  ) => {
    try {
      const response = getHealth(call.request);
      logger.info(
        `Storage service GetHealth response:${JSON.stringify(response)}`,
      );
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  UploadFile: async (
    call: ServerUnaryCall<UploadFileDto, UploadFileEntity>,
    callback: sendUnaryData<UploadFileEntity>,
  ) => {
    try {
      const response = await uploadFile(call.request);
      logger.info(
        `Storage service UploadFile response:${JSON.stringify(response)}`,
      );
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },
};
