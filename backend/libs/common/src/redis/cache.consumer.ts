import { getChannel } from "../rabbitmq/connection";
import redis from "../redis/redis";
import { CacheEventType } from "./cache.events";
import { invalidateByPrefix } from "./invalidateByPrefix";

export const startCacheConsumer = async () => {
  const channel = getChannel();

  await channel.assertQueue("cache.events", { durable: true });

  channel.consume("cache.events", async (msg) => {
    if (!msg) return;

    const event = JSON.parse(msg.content.toString());

    try {
      switch (event.type) {
        case CacheEventType.USERS_INVALIDATE:
          await invalidateByPrefix("users");
          break;

        case CacheEventType.THREATS_INVALIDATE:
          await invalidateByPrefix("threats");
          break;

        case CacheEventType.HAZARDS_INVALIDATE:
          await invalidateByPrefix("hazards");
          break;
      }

      channel.ack(msg);
    } catch (err) {
      console.error("Cache invalidation error:", err);
      channel.nack(msg);
    }
  });
};