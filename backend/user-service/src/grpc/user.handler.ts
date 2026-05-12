import {
  GetHealthDto,
  GetUsersDto,
  GetUserDashboardDto,
  GetUserDashboardChartsDto,
  GetUserDashboardActivityDto,
} from "../dto/user.dto";

import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";

import {
  getHealth,
  getUsers,
  getLocations,
  getEventStatuses,
  getLinkedEventTypes,
  getSeasons,
  getReferenceDays,
  getReferenceTimes,
  getUserDashboard,
  getUserDashboardCharts,
  getUserDashboardActivity,
} from "../services/user.service";

import {
  GetHealthEntity,
  GetUsersEntity,
  GetUserDashboardEntity,
  GetUserDashboardChartsEntity,
  GetUserDashboardActivityEntity,
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

  GetLocations: async (
    call: ServerUnaryCall<any, any>,
    callback: sendUnaryData<any>,
  ) => {
    try {
      const response = await getLocations();
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  GetEventStatuses: async (
    call: ServerUnaryCall<any, any>,
    callback: sendUnaryData<any>,
  ) => {
    try {
      const response = await getEventStatuses();
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  GetLinkedEventTypes: async (
    call: ServerUnaryCall<any, any>,
    callback: sendUnaryData<any>,
  ) => {
    try {
      const response = await getLinkedEventTypes();
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  GetSeasons: async (
    call: ServerUnaryCall<any, any>,
    callback: sendUnaryData<any>,
  ) => {
    try {
      const response = await getSeasons();
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  GetReferenceDays: async (
    call: ServerUnaryCall<any, any>,
    callback: sendUnaryData<any>,
  ) => {
    try {
      const response = await getReferenceDays();
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
  },

  GetReferenceTimes: async (
    call: ServerUnaryCall<any, any>,
    callback: sendUnaryData<any>,
  ) => {
    try {
      const response = await getReferenceTimes();
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
      logger.info(
        `User service GetUserDashboard response:${JSON.stringify(response)}`,
      );
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