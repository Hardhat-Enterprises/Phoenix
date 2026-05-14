import { Op, WhereOptions } from "sequelize";
import {
  HazardEvent,
  GeoLocation,
  DataSource,
  HttpStatusCode,
  logger,
} from "@phoenix/common";
import { GetHazardsDto, GetHazardDto } from "../dto/hazard.dto";
import { GetHazardsEntity, GetHazardEntity } from "../entity/hazard.entity";

export const getHazards = async (dto: GetHazardsDto): Promise<GetHazardsEntity> => {
  try {
    const page = dto.page && dto.page > 0 ? dto.page : 1;
    const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;
    const offset = (page - 1) * limit;

    const where: WhereOptions = {};
    if (dto.hazard_type) where.hazard_type = { [Op.iLike]: `%${dto.hazard_type}%` };
    if (dto.severity_level) where.severity_level = dto.severity_level;
    if (dto.event_status) where.event_status = dto.event_status;

    logger.info(`Fetching hazards with filters: ${JSON.stringify(where)}, page=${page}, limit=${limit}`);

    const { count, rows } = await (HazardEvent as any).findAndCountAll({
      where,
      limit,
      offset,
      order: [["start_time", "DESC"]],
    });

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Hazards fetched successfully",
      hazards: GetHazardsEntity.toEntity(rows),
      total: count,
      page,
      limit,
    };
  } catch (error) {
    logger.error(`Error fetching hazards: ${error}`);
    throw new Error("Error fetching hazards");
  }
};

(HazardEvent as any).belongsTo(GeoLocation, {
  foreignKey: "geo_location_id",
  as: "geo_location",
});

(HazardEvent as any).belongsTo(DataSource, {
  foreignKey: "source_id",
  as: "source",
});
export const getHazard = async (dto: GetHazardDto): Promise<GetHazardEntity> => {
  try {
    logger.info(`Fetching hazard with id: ${dto.hazard_event_id}`);

    const hazard = await (HazardEvent as any).findByPk(dto.hazard_event_id, {
  include: [
    {
      model: GeoLocation,
      as: "geo_location",
    },
    {
      model: DataSource,
      as: "source",
    },
  ],
});

    if (!hazard) {
      return {
        status: HttpStatusCode.HTTP_STATUS_NOT_FOUND,
        message: `Hazard with id ${dto.hazard_event_id} not found`,
      };
    }

    const [mapped] = GetHazardsEntity.toEntity([hazard]);
    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Hazard fetched successfully",
      hazard: mapped,
    };
  } catch (error) {
    logger.error(`Error fetching hazard: ${error}`);
    throw new Error("Error fetching hazard");
  }
};
