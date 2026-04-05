import { HttpStatusCode, logger } from "@phoenix/common";
import { GetHealthDto, GetUsersDto } from "../dto/user.dto";
import { GetHealthEntity, GetUsersEntity } from "../entity/user.entity";

export const getHealth = (getHealthDto: GetHealthDto): GetHealthEntity => {
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "User service is runninng",
  };
};

export const getUsers = (getUserDto: GetUsersDto): GetUsersEntity => {
  logger.info("Fetching users from database...");
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Users fetched successfully",
  };
};
