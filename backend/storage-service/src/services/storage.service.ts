import { HttpStatusCode, logger } from "@phoenix/common";
import { GetHealthDto } from "../dto/storage.dto";
import { GetHealthEntity } from "../entity/storage.entity";

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
