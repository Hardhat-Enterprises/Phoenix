import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { logger } from "@phoenix/common";
import { GetHazardsDto, GetHazardDto } from "../dto/hazard.dto";
import { GetHazardsEntity, GetHazardEntity } from "../entity/hazard.entity";
import { getHazards, getHazard } from "../services/hazard.service";
import redis from "../../../libs/common/src/redis/redis";
import { publishToQueue } from "@phoenix/common";
import { CacheEventType } from "../../../libs/common/src/redis/cache.events";

export const hazardHandler = {
  GetHazards: async (
    call: ServerUnaryCall<GetHazardsDto, GetHazardsEntity>,
    callback: sendUnaryData<GetHazardsEntity>,
  ) => {
    const cacheKey = `hazards:${JSON.stringify(call.request)}`;

    try {
      // 1. Cache lookup
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info("Cache hit: GetHazards");
        return callback(null, JSON.parse(cached));
      }

      // 2. Fetch from service
      const response = await getHazards(call.request);

      logger.info("GetHazards response", response);

      // 3. Cache result (TTL = 120s)
      await redis.setex(cacheKey, 120, JSON.stringify(response));

      callback(null, response);
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
  },

  GetHazard: async (
  call: ServerUnaryCall<GetHazardDto, GetHazardEntity>,
  callback: sendUnaryData<GetHazardEntity>,
) => {
  const id = call.request.hazard_event_id;
  const cacheKey = `hazard:id:${id}`;

  try {
    const cached = await redis.get(cacheKey);

    if (cached) {
      logger.info(`Cache hit: hazard ${id}`);
      return callback(null, JSON.parse(cached));
    }

    const response = await getHazard(call.request);

    logger.info("GetHazard response", response);

    await redis.setex(cacheKey, 300, JSON.stringify(response));

    callback(null, response);
  } catch (error) {
    callback({
      code: 13,
      message: `${error}` || "Internal server error",
    });
  }
  await publishToQueue("cache.events", {
  type: CacheEventType.HAZARDS_INVALIDATE,
});
},
}