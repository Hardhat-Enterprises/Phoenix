import { HttpStatusCode, StoredFile } from "@phoenix/common";
import {
  GetTrainingModelsDto,
  GetOneTrainingModelDto,
} from "../dto/training-model.dto";
import {
  GetTrainingModelsEntity,
  GetOneTrainingModelEntity,
} from "../entity/training-model.dto";

export const getTrainingModels = async (
  request: GetTrainingModelsDto,
): Promise<GetTrainingModelsEntity> => {
  try {
    const trainingModels = await StoredFile.findAll({
      where: {
        mime_type: "pt",
      },
    });
    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Get training models successfully",
      models: trainingModels.map((model) => ({
        file_id: model.file_id,
        original_name: model.original_name,
        mime_type: model.mime_type,
      })),
    };
  } catch (error) {
    return {
      status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: `Failed to get training models: ${error}`,
    };
  }
};

export const getOneTrainingModel = async (
  request: GetOneTrainingModelDto,
): Promise<GetOneTrainingModelEntity> => {
  const { file_id } = request;
  try {
    const trainingModel = await StoredFile.findOne({
      where: {
        file_id,
      },
    });
    if (!trainingModel) {
      return {
        status: HttpStatusCode.HTTP_STATUS_NOT_FOUND,
        message: "Training model not found",
      };
    }
    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Get training model successfully",
      model: {
        file_id: trainingModel.file_id,
        original_name: trainingModel.original_name,
        mime_type: trainingModel.mime_type,
      },
    };
  } catch (error) {
    return {
      status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: `Failed to get training model: ${error}`,
    };
  }
};
