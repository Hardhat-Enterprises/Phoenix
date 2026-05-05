import redis from "../redis/redis";

export const invalidateByPrefix = async (prefix: string) => {
  let cursor = "0";

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      `${prefix}:*`,
      "COUNT",
      100
    );

    cursor = nextCursor;

    if (keys.length > 0) {
      await redis.del(keys);
    }
  } while (cursor !== "0");
};