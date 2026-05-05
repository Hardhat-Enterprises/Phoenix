import {
  GetHealthDto,
  GetUsersDto,
  RegisterUserDto,
  LoginUserDto,
  RefreshTokenDto,
  LogoutUserDto,
} from "../dto/user.dto";

import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";

import {
  getHealth,
  getUsers,
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
} from "../services/user.service";

import {
  GetHealthEntity,
  GetUsersEntity,
  AuthEntity,
} from "../entity/user.entity";

import { logger } from "@phoenix/common";

export const userHandler = {
  GetUserHealth: (
    call: ServerUnaryCall<GetHealthDto, GetHealthEntity>,
    callback: sendUnaryData<GetHealthEntity>,
  ) => {
    try {
      const response = getHealth(call.request);
      logger.info(`User service GetHealth response:${JSON.stringify(response)}`);
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
      logger.info(`User service GetUsers response:${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  //  REGISTER
  RegisterUser: async (
    call: ServerUnaryCall<RegisterUserDto, AuthEntity>,
    callback: sendUnaryData<AuthEntity>,
  ) => {
    try {
      const response = await registerUser(call.request);
      logger.info(`RegisterUser response: ${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  // LOGIN
  LoginUser: async (
    call: ServerUnaryCall<LoginUserDto, AuthEntity>,
    callback: sendUnaryData<AuthEntity>,
  ) => {
    try {
      const response = await loginUser(call.request);
      logger.info(`LoginUser response: ${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  // REFRESH TOKEN
  RefreshToken: async (
    call: ServerUnaryCall<RefreshTokenDto, AuthEntity>,
    callback: sendUnaryData<AuthEntity>,
  ) => {
    try {
      const response = await refreshToken(call.request);
      logger.info(`RefreshToken response: ${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  // LOGOUT
  LogoutUser: async (
    call: ServerUnaryCall<LogoutUserDto, AuthEntity>,
    callback: sendUnaryData<AuthEntity>,
  ) => {
    try {
      const response = await logoutUser(call.request);
      logger.info(`LogoutUser response: ${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },
};