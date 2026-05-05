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

 export const GetHazard = {} => {
  //Implement GetHazard Logic here
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Haards fetched successfully",
    hazards: [
      {
        id: "1",
        type: "Fire",
        description: "Fire hazard in the building"
      },
      {
        id: "2",
        type: "Flood",
        description: "Flood hazard in the area",
      },
  ],
 };
};