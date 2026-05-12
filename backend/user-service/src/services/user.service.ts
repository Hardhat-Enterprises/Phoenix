import { Op } from "sequelize";
import {
  CyberThreat,
  HazardEvent,
  HttpStatusCode,
  logger,
  RiskAssessment,
  UserAccount,
  GeoLocation,
  EventStatus,
  LinkedEventType,
  Season,
  ReferenceDay,
  ReferenceTime,
} from "@phoenix/common";

import {
  GetHealthDto,
  GetUsersDto,
  GetUserDashboardDto,
  GetUserDashboardChartsDto,
  GetUserDashboardActivityDto,
} from "../dto/user.dto";

import {
  GetHealthEntity,
  GetUsersEntity,
  GetUserDashboardEntity,
  GetUserDashboardChartsEntity,
  GetUserDashboardActivityEntity,
} from "../entity/user.entity";

export const getHealth = (
  getHealthDto: GetHealthDto,
): GetHealthEntity => {
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "User service is running",
  };
};

export const getUsers = async (
  getUserDto: GetUsersDto,
): Promise<GetUsersEntity> => {
  try {
    logger.info("Fetching users from database...");

    const users = await UserAccount.findAll({});
    logger.info(`Fetched ${users.length} users from database.`);

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Users fetched successfully",
      users: users.map((user: any) => ({
        user_id: user.user_id,
        username: user.username,
        role: user.role,
      })),
    };
  } catch (error) {
    logger.error(`Error fetching users: ${error}`);
    throw new Error("Error fetching users");
  }
};

export const getLocations = async () => {
  logger.info("Fetching locations from database...");

  const locations = await GeoLocation.findAll({
    attributes: [
      "geo_location_id",
      "country",
      "state_region",
      "local_government_area",
      "suburb",
      "latitude",
      "longitude",
      "geo_precision",
    ],
  });

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Locations fetched successfully",
    locations,
  };
};

export const getEventStatuses = async () => {
  logger.info("Fetching event statuses from database...");

  const eventStatuses = await EventStatus.findAll({
    attributes: ["event_status_id", "event_status_description"],
  });

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Event statuses fetched successfully",
    eventStatuses,
  };
};

export const getLinkedEventTypes = async () => {
  logger.info("Fetching linked event types from database...");

  const linkedEventTypes = await LinkedEventType.findAll({
    attributes: ["linked_event_type_id", "linked_event_type_description"],
  });

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Linked event types fetched successfully",
    linkedEventTypes,
  };
};

export const getSeasons = async () => {
  logger.info("Fetching seasons from database...");

  const seasons = await Season.findAll({
    attributes: ["season_id", "season_description"],
  });

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Seasons fetched successfully",
    seasons,
  };
};

export const getReferenceDays = async () => {
  logger.info("Fetching reference days from database...");

  const referenceDays = await ReferenceDay.findAll({
    attributes: [
      "ref_date",
      "locale_id",
      "dow",
      "is_weekend",
      "season",
      "is_holiday",
    ],
  });

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Reference days fetched successfully",
    referenceDays,
  };
};

export const getReferenceTimes = async () => {
  logger.info("Fetching reference times from database...");

  const referenceTimes = await ReferenceTime.findAll({
    attributes: ["ref_time", "is_nighttime", "is_business_hours"],
  });

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Reference times fetched successfully",
    referenceTimes,
  };
};

export const getUserDashboard = async (
  getUserDashboardDto: GetUserDashboardDto,
): Promise<GetUserDashboardEntity> => {
  try {
    logger.info("Fetching dashboard overview data from database...");

    const [
      totalHazards,
      activeHazards,
      totalThreats,
      activeThreats,
      totalRiskAssessments,
      criticalRisks,
    ] = await Promise.all([
      HazardEvent.count(),
      HazardEvent.count({ where: { event_status: "active" } }),
      CyberThreat.count(),
      CyberThreat.count({ where: { status: "active" } }),
      RiskAssessment.count(),
      RiskAssessment.count({
        where: {
          integration_confidence: {
            [Op.gte]: 0.8,
          },
        },
      }),
    ]);

    return GetUserDashboardEntity.toEntity({
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Dashboard overview retrieved successfully",
      total_hazards: totalHazards,
      active_hazards: activeHazards,
      total_threats: totalThreats,
      active_threats: activeThreats,
      total_risk_assessments: totalRiskAssessments,
      critical_risks: criticalRisks,
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Error fetching dashboard overview data: ${error}`);
    throw new Error("Error fetching dashboard overview data");
  }
};

export const getUserDashboardCharts = async (
  dto: GetUserDashboardChartsDto,
): Promise<GetUserDashboardChartsEntity> => {
  try {
    logger.info("Fetching dashboard chart data from database...");

    const [
      lowHazards,
      mediumHazards,
      highHazards,
      criticalHazards,
      lowThreats,
      mediumThreats,
      highThreats,
      criticalThreats,
      lowRisks,
      mediumRisks,
      highRisks,
      criticalRisks,
    ] = await Promise.all([
      HazardEvent.count({ where: { severity_level: "low" } }),
      HazardEvent.count({ where: { severity_level: "medium" } }),
      HazardEvent.count({ where: { severity_level: "high" } }),
      HazardEvent.count({ where: { severity_level: "critical" } }),
      CyberThreat.count({ where: { risk_level: "low" } }),
      CyberThreat.count({ where: { risk_level: "medium" } }),
      CyberThreat.count({ where: { risk_level: "high" } }),
      CyberThreat.count({ where: { risk_level: "critical" } }),
      RiskAssessment.count({
        where: {
          integration_confidence: {
            [Op.lt]: 0.25,
          },
        },
      }),
      RiskAssessment.count({
        where: {
          integration_confidence: {
            [Op.gte]: 0.25,
            [Op.lt]: 0.5,
          },
        },
      }),
      RiskAssessment.count({
        where: {
          integration_confidence: {
            [Op.gte]: 0.5,
            [Op.lt]: 0.8,
          },
        },
      }),
      RiskAssessment.count({
        where: {
          integration_confidence: {
            [Op.gte]: 0.8,
          },
        },
      }),
    ]);

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Dashboard chart data retrieved successfully",
      hazards_by_severity: JSON.stringify({
        low: lowHazards,
        medium: mediumHazards,
        high: highHazards,
        critical: criticalHazards,
      }),
      threats_by_risk_level: JSON.stringify({
        low: lowThreats,
        medium: mediumThreats,
        high: highThreats,
        critical: criticalThreats,
      }),
      risks_by_level: JSON.stringify({
        low: lowRisks,
        medium: mediumRisks,
        high: highRisks,
        critical: criticalRisks,
      }),
      last_updated: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Error fetching dashboard chart data: ${error}`);
    throw new Error("Error fetching dashboard chart data");
  }
};

export const getUserDashboardActivity = async (
  dto: GetUserDashboardActivityDto,
): Promise<GetUserDashboardActivityEntity> => {
  try {
    logger.info("Fetching dashboard activity data from database...");

    const [recentHazards, recentThreats] = await Promise.all([
      HazardEvent.findAll({
        limit: 5,
        order: [["created_at", "DESC"]],
      }),
      CyberThreat.findAll({
        limit: 5,
        order: [["created_at", "DESC"]],
      }),
    ]);

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Dashboard activity data retrieved successfully",
      recent_hazards: JSON.stringify(recentHazards),
      recent_threats: JSON.stringify(recentThreats),
      last_updated: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Error fetching dashboard activity data: ${error}`);
    throw new Error("Error fetching dashboard activity data");
  }
};