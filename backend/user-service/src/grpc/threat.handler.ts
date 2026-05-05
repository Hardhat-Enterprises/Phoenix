import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { logger } from "@phoenix/common";
import { GetThreatsDto, GetThreatDto } from "../dto/threat.dto";
import { GetThreatsEntity, GetThreatEntity } from "../entity/threat.entity";
import { getThreats, getThreat } from "../services/threat.service";
import redis from "../../../libs/common/src/redis/redis";
import { publishToQueue } from "@phoenix/common";
import { CacheEventType } from "../../../libs/common/src/redis/cache.events";

export const threatHandler = {
  GetThreats: async (
    call: ServerUnaryCall<GetThreatsDto, GetThreatsEntity>,
    callback: sendUnaryData<GetThreatsEntity>,
  ) => {
    const cacheKey = `threats:${JSON.stringify(call.request)}`;

    try {
      // 1. Check cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info("Cache hit: GetThreats");
        return callback(null, JSON.parse(cached));
      }

      // 2. Fetch from service
      const response = await getThreats(call.request);

      logger.info("GetThreats response", response);

      // 3. Store in cache (TTL = 120s)
      await redis.setex(cacheKey, 120, JSON.stringify(response));

      callback(null, response);
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
  },

  GetThreat: async (
    call: ServerUnaryCall<GetThreatDto, GetThreatEntity>,
    callback: sendUnaryData<GetThreatEntity>,
  ) => {
    const { threat_id  } = call.request;
    const cacheKey = `threat:id:${threat_id }`;

    try {
      // 1. Check cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info(`Cache hit: threat ${threat_id }`);
        return callback(null, JSON.parse(cached));
      }

      // 2. Fetch from service
      const response = await getThreat(call.request);

      logger.info("GetThreat response", response);

      // 3. Store in cache (TTL = 300s for single item)
      await redis.setex(cacheKey, 300, JSON.stringify(response));

      callback(null, response);
    } catch (error) {
      callback({ code: 13, message: `${error}` || "Internal server error" });
    }
    await publishToQueue("cache.events", {
  type: CacheEventType.THREATS_INVALIDATE,
});
  },
};