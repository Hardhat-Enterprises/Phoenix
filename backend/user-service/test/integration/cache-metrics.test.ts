import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  jest,
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

import { cacheMetrics } from "@phoenix/common/redis/cacheMetrics";

describe("Cache Metrics", () => {
  const CACHE_KEY = "test:cache-metrics";

  const data = {
    status: 200,
    message: "Test data",
    users: [],
  };

  beforeAll(async () => {
    const connected = await connectRedis();

    if (!connected) {
        throw new Error("Redis could not be connected");
    }
    });

    beforeEach(async () => {
    cacheMetrics.reset();
    await deleteCache(CACHE_KEY);
    });

    afterAll(async () => {
    await deleteCache(CACHE_KEY);

    if (redisClient.isOpen) {
        await redisClient.quit();
    }
    });

    it("should increment the cache hit counter", async () => {
        await setCache(CACHE_KEY, data, 30);

        const result = await getCache<typeof data>(CACHE_KEY);

        expect(result).toEqual(data);

        expect(cacheMetrics.getMetrics().hits).toBe(1);
        expect(cacheMetrics.getMetrics().misses).toBe(0);
    });

    it("should increment the cache miss counter", async () => {
    const result = await getCache<typeof data>(CACHE_KEY);

    expect(result).toBeNull();

    expect(cacheMetrics.getMetrics().hits).toBe(0);
    expect(cacheMetrics.getMetrics().misses).toBe(1);
    });

    it("should increment the cache error counter", async () => {
    jest.spyOn(redisClient, "isReady", "get").mockReturnValue(true);

    jest.spyOn(redisClient, "get").mockRejectedValue(new Error("Redis connection failed"));

    const result = await getCache<typeof data>(CACHE_KEY);

    expect(result).toBeNull();

    expect(cacheMetrics.getMetrics().errors).toBe(1);
    expect(cacheMetrics.getMetrics().hits).toBe(0);
    expect(cacheMetrics.getMetrics().misses).toBe(0);
    });

    it("should increment the cache timeout counter", async () => {
    jest.spyOn(redisClient, "isReady", "get").mockReturnValue(true);

    jest.spyOn(redisClient, "get").mockImplementation(
        () => new Promise<string | null>(() => {})
    );

    const result = await getCache<typeof data>(CACHE_KEY);

    expect(result).toBeNull();

    expect(cacheMetrics.getMetrics().timeouts).toBe(1);
    expect(cacheMetrics.getMetrics().hits).toBe(0);
    expect(cacheMetrics.getMetrics().misses).toBe(0);
    expect(cacheMetrics.getMetrics().errors).toBe(0);
    });
});