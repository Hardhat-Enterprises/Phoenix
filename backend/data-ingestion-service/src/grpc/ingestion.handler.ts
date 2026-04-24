import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { logger } from "@phoenix/common";
import { GetHealthDto, IngestDataDto, CreateHazardDto } from "../dto/ingestion.dto";
import { GetHealthEntity, IngestDataEntity, CreateHazardEntity } from "../entity/ingestion.entity";
import { getHealth, ingestData, createHazardData } from "../services/ingestion.service";

export const ingestionHandler = {
  GetIngestionHealth: (
    call: ServerUnaryCall<GetHealthDto, GetHealthEntity>,
    callback: sendUnaryData<GetHealthEntity>,
  ) => {
    try {
      const response = getHealth(call.request);
      logger.info(`Ingestion service GetHealth response: ${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  IngestData: (
    call: ServerUnaryCall<IngestDataDto, IngestDataEntity>,
    callback: sendUnaryData<IngestDataEntity>,
  ) => {
    try {
      const response = ingestData(call.request);
      logger.info(`Ingestion service IngestData response: ${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  CreateHazardData: async (
    call: ServerUnaryCall<CreateHazardDto, CreateHazardEntity>,
    callback: sendUnaryData<CreateHazardEntity>,
  ) => {
    try {
		const response = await createHazardData(call.request);
    	logger.info(`CreateHazardData response: ${JSON.stringify(response)}`);
    	callback(null, response);
    } catch (error) {
    	callback({
        code: 13,
        message: `${error}` || "Internal server error",
        });
    }
    },
};