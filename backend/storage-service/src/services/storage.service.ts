import { HttpStatusCode, logger, StoredFile } from "@phoenix/common";
import { GetHealthDto, UploadFileDto } from "../dto/storage.dto";
import { GetHealthEntity, UploadFileEntity } from "../entity/storage.entity";
import fs from "fs/promises";

export const getHealth = (request: GetHealthDto): GetHealthEntity => {
  try {
    logger.info("Storage service is healthy");
    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Storage service is healthy",
    };
  } catch (error) {
    logger.error(`Error occurred while checking storage health: ${error}`);
    throw new Error("Failed to check storage health");
  }
};

export const uploadFile = async (
  request: UploadFileDto,
): Promise<UploadFileEntity> => {
  try {
    const { file_path, original_name, mime_type, size } = request;

    const fileBuffer = await fs.readFile(file_path);

    await StoredFile.create({
      original_name,
      mime_type,
      size,
      file_data: fileBuffer,
    });

    await fs.unlink(file_path);

    return {
      status: HttpStatusCode.HTTP_STATUS_CREATED,
      message: "File uploaded successfully",
    };
  } catch (error) {
    logger.error(`Error occurred while uploading file: ${error}`);
    throw new Error("Failed to upload file");
  }
};
