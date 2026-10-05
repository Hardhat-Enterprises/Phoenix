import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { logger } from "@phoenix/common";

import {
  CorrelationRequest,
  CorrelationResponse,
  CorrelationHealthResponse,
} from "../dto/correlation.dto";

import {
  analyseCorrelation,
  getCorrelationHealth,
} from "../services/correlation.service";

export const correlationHandler = {
  AnalyseCorrelation: async (
    call: ServerUnaryCall<CorrelationRequest, CorrelationResponse>,
    callback: sendUnaryData<CorrelationResponse>,
  ) => {
    try {
      const response = await analyseCorrelation(call.request);

      logger.info(
        `Correlation Analyse response: ${JSON.stringify(response)}`,
      );

      callback(null, response);
    } catch (error) {
      logger.error(`Correlation analysis failed: ${error}`);

      callback({
        code: 13,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },

  GetCorrelationHealth: async (
    _call: ServerUnaryCall<
      Record<string, never>,
      CorrelationHealthResponse
    >,
    callback: sendUnaryData<CorrelationHealthResponse>,
  ) => {
    try {
      const response = await getCorrelationHealth();

      logger.info(
        `Correlation health response: ${JSON.stringify(response)}`,
      );

      callback(null, response);
    } catch (error) {
      logger.error(`Correlation health check failed: ${error}`);

      callback({
        code: 13,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
};