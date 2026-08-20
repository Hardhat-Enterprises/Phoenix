import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { logger } from "@phoenix/common";
<<<<<<< HEAD
import { GetHealthDto, IngestDataDto, CreateHazardDto } from "../dto/ingestion.dto";
import { GetHealthEntity, IngestDataEntity, CreateHazardEntity } from "../entity/ingestion.entity";
import { getHealth, ingestData, createHazardData } from "../services/ingestion.service";
=======
import { GetHealthDto, IngestDataDto } from "../dto/ingestion.dto";
import { GetHealthEntity } from "../entity/ingestion.entity";
import { getHealth } from "../services/ingestion.service";
>>>>>>> 97497578c5f35c6c65d54b382079ea6f91f33380

export const ingestionHandler = {
  GetIngestionHealth: (
    call: ServerUnaryCall<GetHealthDto, GetHealthEntity>,
    callback: sendUnaryData<GetHealthEntity>,
  ) => {
    try {
      const response = getHealth(call.request);
      logger.info(
        `Ingestion service GetHealth response: ${JSON.stringify(response)}`,
      );
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },
<<<<<<< HEAD

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
=======
};
>>>>>>> 97497578c5f35c6c65d54b382079ea6f91f33380
