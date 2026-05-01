import { HttpStatusCode, logger, UserAccount } from "@phoenix/common";
import {
  GetHealthDto,
  GetUsersDto,
  GetUserDashboardDto,
} from "../dto/user.dto";
import {
  GetHealthEntity,
  GetUsersEntity,
  GetUserDashboardEntity,
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
    logger.info(`User data: ${JSON.stringify(users)}`);

    const returnUser = GetUsersEntity.toEntity({ users });

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Users fetched successfully",
      users: returnUser.users,
    };
  } catch (error) {
    logger.error(`Error fetching users: ${error}`);
    throw new Error("Error fetching users");
  }
};

export const getUserDashboard = async (
  getUserDashboardDto: GetUserDashboardDto,
): Promise<GetUserDashboardEntity> => {
  try {
    logger.info("Fetching dashboard overview data...");

    return GetUserDashboardEntity.toEntity({
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Dashboard overview retrieved successfully",
      total_hazards: 0,
      active_hazards: 0,
      total_threats: 0,
      active_threats: 0,
      total_risk_assessments: 0,
      critical_risks: 0,
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Error fetching dashboard overview data: ${error}`);
    throw new Error("Error fetching dashboard overview data");
  }
};
