import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { logger } from "@phoenix/common";
import { GetRiskssDto, GetRiskDto } from "../dto/risk.dto";
import { GetRisksEntity, GetRiskEntity } from "../entity/risk.entity";
import { getRisks, getRisk } from "../services/risk.service";

export const riskHandler = {
  GetHazards: async (
    call: ServerUnaryCall<GetRisksDto, GetRisksEntity>,
    callback: sendUnaryData<GetRisksEntity>,
  ) => {
    try {
      const response = await getRisks(call.request);
      logger.info(`GetRisks response: ${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
  },

  GetRisk: async (
    call: ServerUnaryCall<GetRiskDto, GetRiskEntity>,
    callback: sendUnaryData<GetRiskEntity>,
  ) => {
    try {
      const response = await getRisk(call.request);
      logger.info(`GetRisk response: ${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
  },
};
