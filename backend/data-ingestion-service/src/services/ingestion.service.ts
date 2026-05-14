import {
  HttpStatusCode,
  logger,
  StoredFile,
  runInference,
} from "@phoenix/common";
import { GetHealthDto, IngestDataDto } from "../dto/ingestion.dto";
import { GetHealthEntity, IngestDataEntity } from "../entity/ingestion.entity";
import fs from "fs/promises";

export const getHealth = (_getHealthDto: GetHealthDto): GetHealthEntity => {
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Data ingestion service is running",
  };
};

export const createHazardData = (content: any) => {};
export const createCyberData = (content: any) => {};

export const coreModelIntegration = async (payload: any) => {
  console.log("Received core model integration data:", payload);
  const trainingModel = await StoredFile.findOne({
    where: { file_id: payload.model },
  });
  if (!trainingModel) {
    logger.error(`Training model with file_id ${payload.model} not found`);
    return {
      status: HttpStatusCode.HTTP_STATUS_NOT_FOUND,
      message: "Training model not found",
    };
  }

  const modelPath = `/tmp/${trainingModel.original_name}.pt`;

  await fs.writeFile(modelPath, trainingModel.file_data);

  const result = await runInference(modelPath, payload.input_data);
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Core model integration data received successfully",
    data: result,
  };
};
