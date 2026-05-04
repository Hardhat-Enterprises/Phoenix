import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { logger } from "@phoenix/common";
import { GetHazardsDto, GetHazardDto } from "../dto/hazard.dto";
import { GetHazardsEntity, GetHazardEntity } from "../entity/hazard.entity";
import { getHazards, getHazard } from "../services/hazard.service";

export const hazardHandler = {
  GetHazards: async (
    call: ServerUnaryCall<GetHazardsDto, GetHazardsEntity>,
    callback: sendUnaryData<GetHazardsEntity>,
  ) => {
    try {
      const response = await getHazards(call.request);
      logger.info(`GetHazards response: ${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
  },

  GetHazard: async (
    call: ServerUnaryCall<GetHazardDto, GetHazardEntity>,
    callback: sendUnaryData<GetHazardEntity>,
  ) => {
    try {
      const response = await getHazard(call.request);
      logger.info(`GetHazard response: ${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
  },
};
