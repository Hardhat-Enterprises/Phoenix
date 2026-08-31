import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { logger } from "@phoenix/common";
import { GetIntegrationsDto, GetIntegrationDto } from "../dto/integration.dto";
import {
  GetIntegrationsEntity,
  GetIntegrationEntity,
} from "../entity/integration.entity";
import {
  getIntegration,
  getIntegrations,
} from "../services/integration.service";

export const integrationHandler = {
  GetIntegrations: async (
    call: ServerUnaryCall<GetIntegrationsDto, GetIntegrationsEntity>,
    callback: sendUnaryData<GetIntegrationsEntity>,
  ) => {
    try {
      const response = await getIntegrations(call.request);
      logger.info(`GetIntegrations response: ${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
  },

  GetIntegration: async (
    call: ServerUnaryCall<GetIntegrationDto, GetIntegrationEntity>,
    callback: sendUnaryData<GetIntegrationEntity>,
  ) => {
    try {
      const response = await getIntegration(call.request);
      logger.info(`GetIntegration response: ${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
  },
};
