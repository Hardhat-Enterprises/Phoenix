import { GetHealthDto, GetUsersDto } from "../dto/user.dto";
import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { getHealth, getUsers } from "../services/user.service";
import { GetHealthEntity, GetUsersEntity } from "../entity/user.entity";
import { logger } from "@phoenix/common";

export const userHandler = {
  GetUserHealth: (
    call: ServerUnaryCall<GetHealthDto, GetHealthEntity>,
    callback: sendUnaryData<GetHealthEntity>,
  ) => {
    try {
      const response = getHealth(call.request);
      logger.info(`User service GetHealth response:${response}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },
  GetUsers: async (
    call: ServerUnaryCall<GetUsersDto, GetUsersEntity>,
    callback: sendUnaryData<GetUsersEntity>,
  ) => {
    try {
      const response = await getUsers(call.request);
      logger.info(`User service GetUsers response:${response}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },
};
