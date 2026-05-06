import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { logger } from "@phoenix/common";
import { GetThreatsDto, GetThreatDto } from "../dto/threat.dto";
import { GetThreatsEntity, GetThreatEntity } from "../entity/threat.entity";
import { getThreats, getThreat } from "../services/threat.service";

export const threatHandler = {
  GetThreats: async (
    call: ServerUnaryCall<GetThreatsDto, GetThreatsEntity>,
    callback: sendUnaryData<GetThreatsEntity>,
  ) => {
    const cacheKey = `threats:${JSON.stringify(call.request)}`;

    try {
      const response = await getThreats(call.request);

      logger.info("GetThreats response", response);

      callback(null, response);
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
  },

  GetThreat: async (
    call: ServerUnaryCall<GetThreatDto, GetThreatEntity>,
    callback: sendUnaryData<GetThreatEntity>,
  ) => {
    const { threat_id } = call.request;
    const cacheKey = `threat:id:${threat_id}`;

    try {
      const response = await getThreat(call.request);

      logger.info("GetThreat response", response);

      callback(null, response);
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
  },
};
