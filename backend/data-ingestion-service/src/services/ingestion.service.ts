import {
  CoreModelIntegrationEnvelope,
  createTeavsAlert,
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
        ? (JSON.parse(content) as HazardDataStreamRequest)
        : content;

    if (!parsedContent || Object.keys(parsedContent).length === 0) {
      logger.error("Hazard data validation failed: Empty payload");

      await ingestionLog.update({
        processing_status: ProcessingStatus.FAILED,
        fail_reason: "Empty payload",
      });
      return;
    }

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

export const createCyberData = async (content: any) => {
  const ingestionLog = await DataIngestionStreamingLog.create({
    ingestion_type: IngestionTypeEnum.CYBER_THREAT,
    payload: content,
    processing_status: ProcessingStatus.RECEIVED,
    processed_at: new Date(),
  });
  try {
    const parsedContent =
      typeof content === "string" ? JSON.parse(content) : content;

    if (!parsedContent || Object.keys(parsedContent).length === 0) {
      logger.error("Cyber data validation failed: Empty payload");

      await ingestionLog.update({
        processing_status: ProcessingStatus.FAILED,
        fail_reason: "Empty payload",
      });
      return;
    }

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

    await CyberThreat.create({
      ...parsedContent,
      details: JSON.stringify(parsedContent.details),
    });

    await ingestionLog.update({
      processing_status: ProcessingStatus.PROCESSED,
      source_id: source.source_id,
    });

    console.log(
      `Cyber data processed successfully with payload: ${parsedContent}`,
    );
    return;
  } catch (error: any) {
    logger.error(`Cyber data creation failed: ${error.message}`);

    await ingestionLog.update({
      processing_status: ProcessingStatus.FAILED,
      fail_reason: error.message,
    });
    return;
  }
};

export const coreModelIntegration = async (payload: any) => {
  const isEnvelope =
    payload &&
    typeof payload === "object" &&
    typeof payload.integration_event_id === "string" &&
    payload.payload &&
    typeof payload.payload === "object";
  const envelope = isEnvelope
    ? (payload as CoreModelIntegrationEnvelope)
    : undefined;
  const modelInput = envelope?.payload ?? payload?.input_data ?? payload;
  const integrationEventId = envelope?.integration_event_id;

  const [integrationLog, created] = integrationEventId
    ? await IntegrationLog.findOrCreate({
        where: { integration_event_id: integrationEventId },
        defaults: {
          integration_event_id: integrationEventId,
          integration_type: IntegrationType.CORE,
          input: JSON.stringify(modelInput),
          status: IntegrationStatus.CREATED,
        },
      })
    : [
        await IntegrationLog.create({
          integration_type: IntegrationType.CORE,
          input: JSON.stringify(modelInput),
          status: IntegrationStatus.CREATED,
        }),
        true,
      ];

  try {
    if (!created && integrationLog.status === IntegrationStatus.COMPLETED) {
      logger.info(
        `Skipping duplicate ADCRS integration ${integrationLog.integration_event_id}`,
      );
      return integrationLog.output ? JSON.parse(integrationLog.output) : undefined;
    }

    if (!modelInput) {
      logger.error("Core model integration failed: Payload empty");

      await integrationLog.update({
        status: IntegrationStatus.ERROR,
        note: "Payload empty",
      });

      return;
    }

    logger.info(
      `Processing ADCRS integration ${integrationLog.integration_event_id}`,
    );

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

    await integrationLog.update({
      status: IntegrationStatus.PROCESSING,
      input: JSON.stringify(modelInput),
      note: null,
    });

    const result = await runInference(trainingModel.file_data, modelInput);
    const signingSecret = process.env.TEAVS_ADCRS_SIGNING_SECRET || "";
    const teavsAlert = createTeavsAlert({
      sourceIntegrationId: integrationLog.integration_event_id,
      input: modelInput,
      output: result,
      signingSecret,
    });
    const integratedResult = {
      ...result,
      teavs_alert: teavsAlert,
      integration_metadata: {
        source: "ADCRS",
        target: "TEAVS",
        processed_at: new Date().toISOString(),
      },
    };

    await integrationLog.update({
      output: JSON.stringify(integratedResult),
      status: IntegrationStatus.COMPLETED,
    });

    logger.info(
      `Completed secure TEAVS-ADCRS integration ${integrationLog.integration_event_id}`,
    );

    return integratedResult;
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
