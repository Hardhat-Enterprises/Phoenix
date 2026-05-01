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
    logger.info("Fetching user dashboard data from database...");

    const users = await UserAccount.findAll({});

    const totalUsers = users.length;
    const adminUsers = users.filter((user: any) => user.role === "admin").length;
    const standardUsers = users.filter(
      (user: any) => user.role !== "admin",
    ).length;

    return GetUserDashboardEntity.toEntity({
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "User dashboard data fetched successfully",
      total_users: totalUsers,
      admin_users: adminUsers,
      standard_users: standardUsers,
    });
  } catch (error) {
    logger.error(`Error fetching user dashboard data: ${error}`);
    throw new Error("Error fetching user dashboard data");
  }
};
