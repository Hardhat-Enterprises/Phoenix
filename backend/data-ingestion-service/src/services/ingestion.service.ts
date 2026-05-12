import { HttpStatusCode, logger } from "@phoenix/common";
import { HazardEvent } from "@phoenix/common/databases/models";
import { GetHealthDto } from "../dto/ingestion.dto";
import { GetHealthEntity, IngestDataEntity } from "../entity/ingestion.entity";
import DataIngestionStreamingLog from "../entity/data-ingestion.model";

export const getHealth = (_getHealthDto: GetHealthDto): GetHealthEntity => {
	return {
		status: HttpStatusCode.HTTP_STATUS_OK,
		message: "Data ingestion service is running",
	};
};

export const createHazardData = async (
	content: any,
): Promise<IngestDataEntity> => {
	try {
		const parsedContent =
			typeof content === "string" ? JSON.parse(content) : content;

		if (!parsedContent || Object.keys(parsedContent).length === 0) {
			logger.error("Hazard data validation failed: Empty payload");

			const failedLog = await DataIngestionStreamingLog.create({
				ingestion_type: "hazard",
				payload: content,
				processing_status: "failed",
				fail_reason: "Payload is empty",
				processed_at: new Date(),
			});

			return {
				status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
				message: "Hazard data validation failed",
				ingestionId: failedLog.get("ingestion_log_id") as string,
			};
		}

		logger.info(
			`Processing hazard data: ${JSON.stringify(parsedContent)}`,
		);

		const hazardEvent = await HazardEvent.create({
			hazard_type: parsedContent.hazard_type,
			severity_level: parsedContent.severity_level,
			event_status: parsedContent.event_status,
			start_time: new Date(parsedContent.start_time),
			end_time: parsedContent.end_time
				? new Date(parsedContent.end_time)
				: null,
			geo_location_id: parsedContent.geo_location_id ?? null,
			source_id: parsedContent.source_id ?? null,
			source_ref_event: parsedContent.source_ref_event ?? null,
			description: parsedContent.description ?? null,
		});

		const ingestionLog = await DataIngestionStreamingLog.create({
			ingestion_type: "hazard",
			source_id: parsedContent.source_id ?? null,
			payload: {
				...parsedContent,
				hazard_event_id: hazardEvent.get("hazard_event_id"),
			},
			processing_status: "processed",
			received_at: new Date(),
			processed_at: new Date(),
		});

		logger.info(
			`Hazard data processed successfully with ingestion id: ${ingestionLog.get("ingestion_log_id")}`,
		);

		return {
			status: HttpStatusCode.HTTP_STATUS_CREATED,
			message: "Hazard data created successfully",
			ingestionId: ingestionLog.get("ingestion_log_id") as string,
		};
	} catch (error: any) {
		logger.error(`Hazard data creation failed: ${error.message}`);

		const failedLog = await DataIngestionStreamingLog.create({
			ingestion_type: "hazard",
			payload: content,
			processing_status: "failed",
			fail_reason: error.message,
			processed_at: new Date(),
		});

		return {
			status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
			message: "Hazard data creation failed",
			ingestionId: failedLog.get("ingestion_log_id") as string,
		};
	}
};

export const createCyberData = (content: any) => { };