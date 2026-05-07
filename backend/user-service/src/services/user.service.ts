import { HttpStatusCode, logger, User } from "@phoenix/common";
import { GetHealthDto, GetUsersDto } from "../dto/user.dto";
import { GetHealthEntity, GetUsersEntity } from "../entity/user.entity";

export const getHealth = (getHealthDto: GetHealthDto): GetHealthEntity => {
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "User service is running",
  };
};

export const getUsers = async (
  getUsersDto: GetUsersDto
): Promise<GetUsersEntity> => {
  logger.info("Fetching users from database...");

  const existingUsers = await User.findAll({
    attributes: ["id", "name", "email"],
  });

  if (existingUsers.length === 0) {
    await User.bulkCreate([
      {
        name: "Prototype Name One",
        email: "testingemail1@gmail.com",
      },
      {
        name: "Prototype Name Two",
        email: "testingemail2@gmail.com",
      },
    ]);
  }

  const users = await User.findAll({
    attributes: ["id", "name", "email"],
  });

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Users fetched successfully",
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    })),
  };
};