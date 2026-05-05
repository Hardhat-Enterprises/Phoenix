import { HttpStatusCode, logger, UserAccount } from "@phoenix/common";
import { GetHealthDto, GetUsersDto } from "../dto/user.dto";
import { GetHealthEntity, GetUsersEntity } from "../entity/user.entity";
import { publishToQueue } from "@phoenix/common";
import { CacheEventType } from "../../../libs/common/src/redis/cache.events";
import { createUserInDb } from "./user.service"; // Needs a fix

export const createUser = async (req, res) => {
  try {
    const user = await createUserInDb(req.body);

    await publishToQueue("cache.events", {
      type: CacheEventType.USERS_INVALIDATE,
      payload: {
        userId: user.id,
      },
    });

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error creating user:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

export const getHealth = (getHealthDto: GetHealthDto): GetHealthEntity => {
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "User service is runninng",
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
