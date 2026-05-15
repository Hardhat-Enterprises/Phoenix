import fs from "fs/promises";
import {
  DataStreamRequest,
  HttpStatusCode,
  IngestionTypeEnum,
  logger,
  ProcessingStatus,
  StoredFile,
  runInference,
} from "@phoenix/common";
import { HazardEvent, GeoLocation } from "@phoenix/common/databases/models";
import { DataSource } from "@phoenix/common/databases/models/data-source.model";
import { GetHealthDto } from "../dto/ingestion.dto";
import { GetHealthEntity } from "../entity/ingestion.entity";
import { DataIngestionStreamingLog } from "@phoenix/common";

export const getHealth = (_getHealthDto: GetHealthDto): GetHealthEntity => {
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Data ingestion service is running",
  };
};

export const createHazardData = async (content: any) => {
  const ingestionLog = await DataIngestionStreamingLog.create({
    ingestion_type: IngestionTypeEnum.HAZARD,
    payload: content,
    processing_status: ProcessingStatus.RECEIVED,
    processed_at: new Date(),
  });
  try {
    const parsedContent =
      typeof content === "string"
        ? (JSON.parse(content) as DataStreamRequest)
        : content;

    if (!parsedContent || Object.keys(parsedContent).length === 0) {
      logger.error("Hazard data validation failed: Empty payload");

      await ingestionLog.update({
        processing_status: ProcessingStatus.FAILED,
        fail_reason: "Empty payload",
      });
      return;
    }

    // const [location] = await GeoLocation.findOrCreate({
    //     where: {
    //         state_region: parsedContent.location.state_region,
    //         local_government_area: parsedContent.location.local_government_area,
    //         suburb: parsedContent.location.suburb,
    //     },
    //     defaults: {
    //         country: "Australia",
    //         state_region: parsedContent.location.state_region,
    //         local_government_area: parsedContent.location.local_government_area,
    //         suburb: parsedContent.location.suburb,
    //         geo_precision: "suburb",
    //     },
    // });

    const [source] = await DataSource.findOrCreate({
      where: {
        source_name: parsedContent.source,
      },
      defaults: {
        source_name: parsedContent.source,
        source_type: "ai_model",
        access_method: "rabbitmq",
      },
    });

    await HazardEvent.create(parsedContent);

    await ingestionLog.update({
      processing_status: ProcessingStatus.PROCESSED,
      source_id: source.source_id,
    });

    console.log(
      `Hazard data processed successfully with payload: ${parsedContent}`,
    );
    return;
  } catch (error: any) {
    logger.error(`Hazard data creation failed: ${error.message}`);

    await ingestionLog.update({
      processing_status: ProcessingStatus.FAILED,
      fail_reason: error.message,
    });
    return;
  }
};

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
