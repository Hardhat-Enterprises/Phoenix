import { GetHealthDto, GetUsersDto } from "../dto/user.dto";
import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { getHealth, getUsers } from "../services/user.service";
import { GetHealthEntity, GetUsersEntity } from "../entity/user.entity";
import { logger } from "@phoenix/common";
import redis from "../../../libs/common/src/redis/redis";
import { publishToQueue } from "@phoenix/common";
import { CacheEventType } from "../../../libs/common/src/redis/cache.events";


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
    const cacheKey = "users:list";

    try {
      // 1. Check cache
      const cached = await redis.get(cacheKey);

      if (cached) {
        logger.info("Cache hit: users:list");
        return callback(null, JSON.parse(cached));
      }

      // 2. Fetch from service (DB)
      const response = await getUsers(call.request);

      logger.info(`User service GetUsers response:${response}`);

      // 3. Store in cache (TTL = 120s)
      await redis.setex(cacheKey, 120, JSON.stringify(response));

      // 4. Return response
      callback(null, response);
    } catch (error) {
      callback({
        code: 13,
        message: `${error}` || "Internal server error",
      });
    }
await publishToQueue("cache.events", {
  type: CacheEventType.USERS_INVALIDATE,
});
  },
};
