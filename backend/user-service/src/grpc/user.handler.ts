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

import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";

import {
  getHealth,
  getUsers,
  getUserDashboard,
  getUserDashboardCharts,
  getUserDashboardActivity,
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
} from "../services/user.service";

import {
  GetHealthEntity,
  GetUsersEntity,
  GetUserDashboardEntity,
  GetUserDashboardChartsEntity,
  GetUserDashboardActivityEntity,
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

  RegisterUser: async (
    call: ServerUnaryCall<RegisterUserDto, AuthEntity>,
    callback: sendUnaryData<AuthEntity>,
  ) => {
    try {
      const response = await registerUser(call.request);
      logger.info(`RegisterUser response:${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  LoginUser: async (
    call: ServerUnaryCall<LoginUserDto, AuthEntity>,
    callback: sendUnaryData<AuthEntity>,
  ) => {
    try {
      const response = await loginUser(call.request);
      logger.info(`LoginUser response:${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  RefreshToken: async (
    call: ServerUnaryCall<RefreshTokenDto, AuthEntity>,
    callback: sendUnaryData<AuthEntity>,
  ) => {
    try {
      const response = await refreshToken(call.request);
      logger.info(`RefreshToken response:${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  LogoutUser: async (
    call: ServerUnaryCall<LogoutUserDto, AuthEntity>,
    callback: sendUnaryData<AuthEntity>,
  ) => {
    try {
      const response = await logoutUser(call.request);
      logger.info(`LogoutUser response:${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  GetUserDashboard: async (
    call: ServerUnaryCall<GetUserDashboardDto, GetUserDashboardEntity>,
    callback: sendUnaryData<GetUserDashboardEntity>,
  ) => {
    try {
      const response = await getUserDashboard(call.request);
      logger.info(`User service GetUserDashboard response:${JSON.stringify(response)}`);
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  GetUserDashboardCharts: async (
    call: ServerUnaryCall<
      GetUserDashboardChartsDto,
      GetUserDashboardChartsEntity
    >,
    callback: sendUnaryData<GetUserDashboardChartsEntity>,
  ) => {
    try {
      const response = await getUserDashboardCharts(call.request);
      logger.info(
        `User service GetUserDashboardCharts response:${JSON.stringify(response)}`,
      );
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  GetUserDashboardActivity: async (
    call: ServerUnaryCall<
      GetUserDashboardActivityDto,
      GetUserDashboardActivityEntity
    >,
    callback: sendUnaryData<GetUserDashboardActivityEntity>,
  ) => {
    try {
      const response = await getUserDashboardActivity(call.request);
      logger.info(
        `User service GetUserDashboardActivity response:${JSON.stringify(response)}`,
      );
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },
};