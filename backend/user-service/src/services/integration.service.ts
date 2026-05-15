import { Op } from "sequelize";
import {
  IntegrationLog,
  HttpStatusCode,
  logger,
  EventStatus,
} from "@phoenix/common";
import { GetIntegrationsDto, GetIntegrationDto } from "../dto/integration.dto";
import {
  GetIntegrationsEntity,
  GetIntegrationEntity,
} from "../entity/integration.entity";
import { LinkedEventType } from "@phoenix/common/databases/models/linked-event-typed";

export const getIntegrations = async (
  dto: GetIntegrationsDto,
): Promise<GetIntegrationsEntity> => {
  try {
    const page = dto.page && dto.page > 0 ? dto.page : 1;
    const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;
    const offset = (page - 1) * limit;

    const where: Record<string, any> = {};
    const include: Record<string, any>[] = [];

    logger.info(
      `Fetching risks with filters: ${JSON.stringify(where)}, page=${page}, limit=${limit}`,
    );

    const { count, rows } = await IntegrationLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [["created_at", "DESC"]],
      include,
    });

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Integrations fetched successfully",
      integrations: GetIntegrationsEntity.toEntity(rows),
      total: count,
      page,
      limit,
    };
  } catch (error) {
    logger.error(`Error fetching risks: ${error}`);
    throw new Error("Error fetching risks");
  }
};

export const getIntegration = async (
  dto: GetIntegrationDto,
): Promise<GetIntegrationEntity> => {
  try {
    logger.info(`Fetching integration  with id: ${dto.integration_event_id}`);

    const integration = await IntegrationLog.findByPk(dto.integration_event_id);

    if (!integration) {
      return {
        status: HttpStatusCode.HTTP_STATUS_NOT_FOUND,
        message: `Integration with id ${dto.integration_event_id} not found`,
      };
    }

    const [mapped] = GetIntegrationsEntity.toEntity([integration]);
    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Integration  fetched successfully",
      integration: mapped,
    };
  } catch (error) {
    logger.error(`Error fetching risk: ${error}`);
    throw new Error("Error fetching risk");
  }
};
