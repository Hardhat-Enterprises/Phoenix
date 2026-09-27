import fs from "fs/promises";

import {
  HazardDataStreamRequest,
  CyberDataStreamRequest,
  HttpStatusCode,
  IngestionTypeEnum,
  logger,
  ProcessingStatus,
  StoredFile,
  runInference,
  IntegrationType,
  IntegrationStatus,
  CyberThreat,
} from "@phoenix/common";
import {
  HazardEvent,
  GeoLocation,
  IntegrationLog,
  DataSource,
} from "@phoenix/common";
import { GetHealthDto } from "../dto/ingestion.dto";
import { GetHealthEntity } from "../entity/ingestion.entity";
import { DataIngestionStreamingLog } from "@phoenix/common";
import {
  validateThreatPayload,
  normaliseThreatPayload,
  isHighRiskThreat,
} from "./threat-validation.service";
export const getHealth = (_getHealthDto: GetHealthDto): GetHealthEntity => {
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Data ingestion service is running",
  };
};

export const createCyberData = async (content: any) => {
  const ingestionLog = await DataIngestionStreamingLog.create({
    ingestion_type: IngestionTypeEnum.CYBER_THREAT,
    payload: content,
    processing_status: ProcessingStatus.RECEIVED,
    processed_at: new Date(),
  });

  try {
    // Step 1: Parse incoming cyber threat payload
    const parsedContent =
      typeof content === "string" ? JSON.parse(content) : content;

    // Step 2: Reject empty or invalid payload objects
    if (
      !parsedContent ||
      typeof parsedContent !== "object" ||
      Object.keys(parsedContent).length === 0
    ) {
      logger.error("Cyber data validation failed: Empty payload");

      await ingestionLog.update({
        processing_status: ProcessingStatus.FAILED,
        fail_reason: "Empty payload",
      });

      return;
    }

    // Step 3: Validate threat-analysis fields
    const validation = validateThreatPayload(parsedContent);

    if (!validation.valid) {
      const failureReason = validation.errors.join(", ");

      logger.error(
        `Cyber threat payload validation failed: ${failureReason}`,
      );

      await ingestionLog.update({
        processing_status: ProcessingStatus.FAILED,
        fail_reason: failureReason,
      });

      return;
    }

    // Step 4: Log non-critical warnings
    if (validation.warnings.length > 0) {
      logger.warn(
        `Cyber threat payload validation warnings: ${validation.warnings.join(
          ", ",
        )}`,
      );
    }

    // Step 5: Normalise validated data
    const normalisedPayload = normaliseThreatPayload(parsedContent);

    // Step 6: Risk-based threat classification
    const highRisk = isHighRiskThreat(normalisedPayload);

    if (highRisk) {
      logger.warn(
        `High-risk cyber threat detected: ` +
          `${normalisedPayload.cyber_threat} | ` +
          `severity=${normalisedPayload.severity} | ` +
          `risk_score=${normalisedPayload.risk_score}`,
      );
    } else {
      logger.info(
        `Cyber threat accepted: ` +
          `${normalisedPayload.cyber_threat} | ` +
          `severity=${normalisedPayload.severity}`,
      );
    }

    // Step 7: Register or retrieve the threat data source
    const [source] = await DataSource.findOrCreate({
      where: {
        source_name: normalisedPayload.source,
      },
      defaults: {
        source_name: normalisedPayload.source,
        source_type: "ai_model",
        access_method: "rabbitmq",
      },
    });

    // Step 8: Store validated cyber threat
    await CyberThreat.create({
      ...normalisedPayload,
      details:
        normalisedPayload.details !== undefined
          ? JSON.stringify(normalisedPayload.details)
          : undefined,
    });

    // Step 9: Mark ingestion as successfully processed
    await ingestionLog.update({
      processing_status: ProcessingStatus.PROCESSED,
      source_id: source.source_id,
    });

    logger.info(
      `Cyber threat processed successfully: ${normalisedPayload.cyber_threat}`,
    );

    return;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error(`Cyber data creation failed: ${errorMessage}`);

    await ingestionLog.update({
      processing_status: ProcessingStatus.FAILED,
      fail_reason: errorMessage,
    });

    return;
  }
};

export const coreModelIntegration = async (payload: any) => {
  const integrationLog = await IntegrationLog.create({
    integration_type: IntegrationType.CORE,
    input: JSON.stringify(payload),
    status: IntegrationStatus.CREATED,
  });

  try {
    if (!payload) {
      logger.error("Core model integration failed: Payload empty");

      await integrationLog.update({
        status: IntegrationStatus.ERROR,
        note: "Payload empty",
      });

      return;
    }

    console.log("Received core model integration data:", payload);

    const trainingModel = await StoredFile.findOne({
      where: {
        original_name:
          "final_core_xgb_xgboost_trey_xgb_core_v2_epoch_100.joblib",
      },
    });

    if (!trainingModel) {
      logger.error("Training model not found");

      await integrationLog.update({
        status: IntegrationStatus.ERROR,
        note: "Training model not found",
      });

      return;
    }

    if (!trainingModel.file_data) {
      logger.error("Training model file_data is empty");

      await integrationLog.update({
        status: IntegrationStatus.ERROR,
        note: "Training model file_data is empty",
      });

      return;
    }

    const modelInput = payload.input_data ?? payload;

    if (!modelInput) {
      logger.error("Model input data is empty");

      await integrationLog.update({
        status: IntegrationStatus.ERROR,
        note: "Model input data is empty",
      });

      return;
    }

    await integrationLog.update({
      status: IntegrationStatus.PROCESSING,
    });

    const result = await runInference(trainingModel.file_data, modelInput);

    console.log("Core model inference result:", result);

    await integrationLog.update({
      output: JSON.stringify(result),
      status: IntegrationStatus.COMPLETED,
    });

    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`Core model integration error: ${errorMessage}`);

    await integrationLog.update({
      status: IntegrationStatus.ERROR,
      note: errorMessage,
    });

    return;
  }
};
