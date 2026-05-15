import { HttpStatusCode, logger } from "@phoenix/common";
import { HazardEvent, GeoLocation } from "@phoenix/common/databases/models";
import { DataSource } from "@phoenix/common/databases/models/data-source.model";
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

        const [location] = await GeoLocation.findOrCreate({
            where: {
                state_region: parsedContent.location.state_region,
                local_government_area: parsedContent.location.local_government_area,
                suburb: parsedContent.location.suburb,
            },
            defaults: {
                country: "Australia",
                state_region: parsedContent.location.state_region,
                local_government_area: parsedContent.location.local_government_area,
                suburb: parsedContent.location.suburb,
                geo_precision: "suburb",
            },
        });

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

        const hazardEvent = await HazardEvent.create({
            hazard_type: parsedContent.payload.hazard_type,
            severity_level: parsedContent.payload.severity,
            event_status: parsedContent.event_status ?? "active",
            start_time: new Date(parsedContent.timestamp) || new Date(),
            end_time: parsedContent.end_time
                ? new Date(parsedContent.end_time)
                : null,
            geo_location_id: location.get("geo_location_id") as string,
            source_id: source.get("source_id") as string,
            source_ref_event: parsedContent.event_id ?? "",
            description: parsedContent.description ?? "",
        });

        const ingestionLog = await DataIngestionStreamingLog.create({
            ingestion_type: "hazard",
            source_id: source.get("source_id") as string,
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