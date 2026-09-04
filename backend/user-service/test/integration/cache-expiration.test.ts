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

describe("Cache Expiration", () => {
  const CACHE_KEY = "test:cache-expiration";

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

  it("should return null after cache expires", async () => {
    await deleteCache(CACHE_KEY);

    await setCache(CACHE_KEY, data, 1);

    // Confirm the data is initially cached
    const cachedData = await getCache<typeof data>(CACHE_KEY);

    expect(cachedData).toEqual(data);

    // Wait for the 1-second TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Confirm the data has expired
    const expiredData = await getCache<typeof data>(CACHE_KEY);

    //Will pass
    expect(expiredData).toBeNull();
    //Will fail
    //expect(expiredData).toEqual(data);
  });
});