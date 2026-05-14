import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { logger } from "@phoenix/common";
import {
  GetTrainingModelsDto,
  GetOneTrainingModelDto,
} from "../dto/training-model.dto";
import {
  GetTrainingModelsEntity,
  GetOneTrainingModelEntity,
} from "../entity/training-model.dto";
import {
  getTrainingModels,
  getOneTrainingModel,
} from "../services/training-model.service";

export const trainingModelHandler = {
  GetTrainingModels: async (
    call: ServerUnaryCall<GetTrainingModelsDto, GetTrainingModelsEntity>,
    callback: sendUnaryData<GetTrainingModelsEntity>,
  ) => {
    try {
      const response = await getTrainingModels({});
      logger.info(
        `User service GetTrainingModels response:${JSON.stringify(response)}`,
      );
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  GetOneTrainingModel: async (
    call: ServerUnaryCall<GetOneTrainingModelDto, GetOneTrainingModelEntity>,
    callback: sendUnaryData<GetOneTrainingModelEntity>,
  ) => {
    try {
      const response = await getOneTrainingModel(call.request);
      logger.info(
        `User service GetOneTrainingModel response:${JSON.stringify(response)}`,
      );
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },
};
