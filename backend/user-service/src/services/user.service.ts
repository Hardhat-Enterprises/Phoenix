import { Op } from "sequelize";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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
  UserRole,
} from "@phoenix/common";

import {
  GetHealthDto,
  GetUsersDto,
  GetUserDashboardDto,
  GetUserDashboardChartsDto,
  GetUserDashboardActivityDto,
  RegisterUserDto,
  LoginUserDto,
  RefreshTokenDto,
  LogoutUserDto,
} from "../dto/user.dto";

import {
  GetHealthEntity,
  GetUsersEntity,
  GetUserDashboardEntity,
  GetUserDashboardChartsEntity,
  GetUserDashboardActivityEntity,
  AuthEntity,
} from "../entity/user.entity";

export const getHealth = (getHealthDto: GetHealthDto): GetHealthEntity => {
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

const JWT_SECRET = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;

const JWT_REFRESH_SECRET =
  process.env.AUTH_JWT_REFRESH_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error("JWT secrets are not defined");
}

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export const registerUser = async (
  dto: RegisterUserDto,
): Promise<AuthEntity> => {
  try {
    if (!dto.username || !dto.password) {
      return {
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "Username and password are required",
      };
    }

    if (dto.role && !Object.values(UserRole).includes(dto.role as UserRole)) {
      return {
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "Invalid user role",
      };
    }

    const existingUser = await UserAccount.findOne({
      where: { username: dto.username },
    });

    if (existingUser) {
      return {
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "Username already exists",
      };
    }

    const password_hashed = await bcrypt.hash(dto.password, 10);

    const newUser = await UserAccount.create({
      username: dto.username,
      password_hashed,
      role: dto.role || "user",
    });

    return {
      status: HttpStatusCode.HTTP_STATUS_CREATED,
      message: "User registered successfully",
      user_id: newUser.user_id,
      username: newUser.username,
      role: newUser.role,
    };
  } catch (error) {
    logger.error(`Register error: ${error}`);
    throw new Error("Register failed");
  }
};

export const loginUser = async (dto: LoginUserDto): Promise<AuthEntity> => {
  try {
    if (!dto.username || !dto.password) {
      return {
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "Username and password are required",
      };
    }

    const user = await UserAccount.findOne({
      where: { username: dto.username },
    });

    if (!user) {
      return {
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Invalid username or password",
      };
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password_hashed,
    );

    if (!isPasswordValid) {
      return {
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Invalid username or password",
      };
    }

    const tokenPayload = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
    };

    const access_token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refresh_token = jwt.sign(tokenPayload, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    await user.update({
      access_token,
      refresh_token,
    });

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Login successful",
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      access_token,
      refresh_token,
    };
  } catch (error) {
    logger.error(`Login error: ${error}`);
    throw new Error("Login failed");
  }
};

export const refreshToken = async (
  dto: RefreshTokenDto,
): Promise<AuthEntity> => {
  try {
    if (!dto.refresh_token) {
      return {
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Refresh token is required",
      };
    }

    const decoded = jwt.verify(dto.refresh_token, JWT_REFRESH_SECRET) as {
      user_id: string;
      username: string;
      role: string;
    };

    const user = await UserAccount.findByPk(decoded.user_id);

    if (!user || user.refresh_token !== dto.refresh_token) {
      return {
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Invalid refresh token",
      };
    }

    const access_token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    await user.update({ access_token });

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Token refreshed successfully",
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      access_token,
      refresh_token: dto.refresh_token,
    };
  } catch (error) {
    logger.error(`Refresh token error: ${error}`);

    return {
      status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
      message: "Invalid or expired refresh token",
    };
  }
};

export const logoutUser = async (dto: LogoutUserDto): Promise<AuthEntity> => {
  try {
    if (!dto.user_id) {
      return {
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "User ID is required",
      };
    }

    const user = await UserAccount.findByPk(dto.user_id);

    if (!user) {
      return {
        status: HttpStatusCode.HTTP_STATUS_NOT_FOUND,
        message: "User not found",
      };
    }

    await user.update({
      access_token: "",
      refresh_token: "",
    });

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Logged out successfully",
    };
  } catch (error) {
    logger.error(`Logout error: ${error}`);
    throw new Error("Logout failed");
  }
};
