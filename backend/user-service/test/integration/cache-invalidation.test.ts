import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from "@jest/globals";

import {
  getCache,
  setCache,
  deleteCache,
} from "@phoenix/common/redis/cache";

import {
  connectRedis,
  redisClient,
} from "@phoenix/common/redis/redisClient";

describe("Cache Invalidation", () => {
  const CACHE_KEY = "test:cache-invalidation";

  const data = {
    status: 200,
    message: "Test data",
    users: [],
  };

  beforeAll(async () => {
    const connected = await connectRedis();

    if (!connected) {
      throw new Error("Redis could not be connected for integration test");
    }
  });

  afterAll(async () => {
    await deleteCache(CACHE_KEY);

    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });

  it("should return null after cache is deleted", async () => {
    await deleteCache(CACHE_KEY);

    await setCache(CACHE_KEY, data, 300);

    const cachedData = await getCache<typeof data>(CACHE_KEY);

    expect(cachedData).toEqual(data);

    await deleteCache(CACHE_KEY);

    const deletedData = await getCache<typeof data>(CACHE_KEY);
    //Will pass
    expect(deletedData).toBeNull();
    //Will fail
    //expect(deletedData).toEqual(data);
  });
});