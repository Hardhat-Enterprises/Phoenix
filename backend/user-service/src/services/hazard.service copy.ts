import { Op } from "sequelize";
import { RiskEvent, HttpStatusCode, logger } from "@phoenix/common";
import { GetRisksDto, GetRiskDto } from "../dto/risk.dto";
import { GetRisksEntity, GetRiskEntity } from "../entity/risk.entity";

export const getHazards = async (dto: GetRisksDto): Promise<GetRisksEntity> => {
  try {
    const page = dto.page && dto.page > 0 ? dto.page : 1;
    const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;
    const offset = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (dto.hazard_id) where.hazard_id = { [Op.iLike]: `%${dto.hazard_id}%` };
    if (dto.threat_id) where.threat_id = dto.threat_id;
    if (dto.event_status) where.event_status = dto.event_status;
    if (dto.linked_event_type) where linked_event_type = dto.linked_event_type;

    logger.info(`Fetching risks with filters: ${JSON.stringify(where)}, page=${page}, limit=${limit}`);

    const { count, rows } = await RiskEvent.findAndCountAll({
      where,
      limit,
      offset,
      order: [["start_time", "DESC"]],
    });

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Risks fetched successfully",
      hazards: GetRisksEntity.toEntity(rows),
      total: count,
      page,
      limit,
    };
  } catch (error) {
    logger.error(`Error fetching risks: ${error}`);
    throw new Error("Error fetching risks");
  }
};

export const getHazard = async (dto: GetRiskDto): Promise<GetRiskEntity> => {
  try {
    logger.info(`Fetching risk  with id: ${dto.integration_event_id}`);

    const risk = await RiskEvent.findByPk(dto.integration_event_id);

    if (!risk) {
      return {
        status: HttpStatusCode.HTTP_STATUS_NOT_FOUND,
        message: `Risk with id ${dto.integration_event_id} not found`,
      };
    }

    const [mapped] = GetRisksEntity.toEntity([risk]);
    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Risk  fetched successfully",
      hazard: mapped,
    };
  } catch (error) {
    logger.error(`Error fetching risk: ${error}`);
    throw new Error("Error fetching risk");
  }
};
