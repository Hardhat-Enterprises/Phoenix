import { HttpStatusCode, logger } from "@phoenix/common";
import { GetHealthDto, IngestDataDto } from "../dto/ingestion.dto";
import { GetHealthEntity, IngestDataEntity } from "../entity/ingestion.entity";
import { validateHazardData } from "../validators/hazard.validator";
import { publishHazardToQueue } from "../queues/hazard.queue";
import { CreateHazardDto } from "../dto/ingestion.dto";
import { CreateHazardEntity } from "../entity/ingestion.entity";

export const getHealth = (_getHealthDto: GetHealthDto): GetHealthEntity => {
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Data ingestion service is running",
  };
};

export const ingestData = (ingestDataDto: IngestDataDto): IngestDataEntity => {
  logger.info("Received ingestion request...");

  if (!ingestDataDto?.source || !ingestDataDto?.payload) {
    return {
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
      message: "source and payload are required",
    };
  }

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Data ingested successfully",
    ingestionId: `ing-${Date.now()}`,
  };
};

export const createHazardData = async (
  createHazardDto: CreateHazardDto,
): Promise<CreateHazardEntity> => {
  try {
    logger.info("[INFO] Hazard data creation request received");

    validateHazardData(createHazardDto);

    const ingestionId = await publishHazardToQueue(createHazardDto);

    logger.info(`[SUCCESS] Hazard data creation queued. ingestionId=${ingestionId}`);

    return {
      status: HttpStatusCode.HTTP_STATUS_CREATED || 201,
      message: "Hazard data creation queued successfully",
      ingestionId,
    };
  } catch (error: any) {
    logger.error(`[FAILED] Hazard data creation failed. Reason: ${error.message}`);

    return {
      status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST || 400,
      message: "Hazard data creation failed",
      failedReason: error.message,
    };
  }
};