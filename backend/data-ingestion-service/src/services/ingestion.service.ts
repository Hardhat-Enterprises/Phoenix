import { HttpStatusCode, logger } from "@phoenix/common";
import { GetHealthDto, IngestDataDto } from "../dto/ingestion.dto";
import { GetHealthEntity, IngestDataEntity } from "../entity/ingestion.entity";

export const getHealth = (_getHealthDto: GetHealthDto): GetHealthEntity => {
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Data ingestion service is running",
  };
};

export const createHazardData = (content: any) => {};
export const createCyberData = (content: any) => {};
