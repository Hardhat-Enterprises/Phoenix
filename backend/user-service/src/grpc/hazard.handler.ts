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
    const cacheKey = `hazards:${JSON.stringify(call.request)}`;

    try {
      const response = await getHazards(call.request);

      callback(null, response);
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
  },

  GetHazard: async (
    call: ServerUnaryCall<GetHazardDto, GetHazardEntity>,
    callback: sendUnaryData<GetHazardEntity>,
  ) => {
    const id = call.request.hazard_event_id;
    const cacheKey = `hazard:id:${id}`;

    try {
      const response = await getHazard(call.request);

      logger.info("GetHazard response", response);

      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },
};
