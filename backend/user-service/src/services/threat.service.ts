import { Op } from "sequelize";
import { CyberThreat, HttpStatusCode, logger } from "@phoenix/common";
import { GetThreatsDto, GetThreatDto } from "../dto/threat.dto";
import { GetThreatsEntity, GetThreatEntity } from "../entity/threat.entity";

export const getThreats = async (dto: GetThreatsDto): Promise<GetThreatsEntity> => {
  try {
    const page = dto.page && dto.page > 0 ? dto.page : 1;
    const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;
    const offset = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (dto.threat_type) where.threat_type = { [Op.iLike]: `%${dto.threat_type}%` };
    if (dto.risk_level) where.risk_level = dto.risk_level;
    if (dto.status) where.status = dto.status;

    logger.info(`Fetching threats with filters: ${JSON.stringify(where)}, page=${page}, limit=${limit}`);

    const { count, rows } = await CyberThreat.findAndCountAll({
      where,
      limit,
      offset,
      order: [["detected_at", "DESC"]],
    });

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Threats fetched successfully",
      threats: GetThreatsEntity.toEntity(rows),
      total: count,
      page,
      limit,
    };
  } catch (error) {
    logger.error(`Error fetching threats: ${error}`);
    throw new Error("Error fetching threats");
  }
};

export const getThreat = async (dto: GetThreatDto): Promise<GetThreatEntity> => {
  try {
    logger.info(`Fetching threat with id: ${dto.threat_id}`);

    const threat = await CyberThreat.findByPk(dto.threat_id);

    if (!threat) {
      return {
        status: HttpStatusCode.HTTP_STATUS_NOT_FOUND,
        message: `Threat with id ${dto.threat_id} not found`,
      };
    }

    const [mapped] = GetThreatsEntity.toEntity([threat]);
    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Threat fetched successfully",
      threat: mapped,
    };
  } catch (error) {
    logger.error(`Error fetching threat: ${error}`);
    throw new Error("Error fetching threat");
  }
};
