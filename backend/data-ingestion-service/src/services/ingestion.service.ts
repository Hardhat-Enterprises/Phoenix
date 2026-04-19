import { HttpStatusCode, logger } from "@phoenix/common";
import { GetHealthDto, IngestDataDto } from "../dto/ingestion.dto";
import { GetHealthEntity, IngestDataEntity } from "../entity/ingestion.entity";

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