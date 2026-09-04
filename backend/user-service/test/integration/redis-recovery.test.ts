import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from "@jest/globals";

import { getUsers } from "../../src/services/user.service";

import {
  redisClient,
  connectRedis,
} from "@phoenix/common/redis/redisClient";

import {
  deleteCache,
  getCache,
} from "@phoenix/common/redis/cache";

describe("Redis Recovery", () => {
  const CACHE_KEY = "users:all";

  beforeAll(async () => {
    const connected = await connectRedis();

    if (!connected) {
      throw new Error("Redis could not be connected");
    }
  });

  beforeEach(async () => {
    await deleteCache(CACHE_KEY);
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await deleteCache(CACHE_KEY);

    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });

  it("should fallback to database when Redis is unavailable and recover when Redis returns", async () => {
    const isReadySpy = jest
      .spyOn(redisClient, "isReady", "get")
      .mockReturnValue(false);

    // Redis unavailable
    const fallbackResult = await getUsers({} as any);

    expect(fallbackResult.status).toBe(200);
    expect(fallbackResult.users).toBeDefined();
    expect(fallbackResult.users!.length).toBeGreaterThan(0);

    // Redis is available again
    isReadySpy.mockReturnValue(true);

    // Make sure the cache is empty so getUsers() has to populate it
    await deleteCache(CACHE_KEY);

    const recoveredResult = await getUsers({} as any);

    expect(recoveredResult.status).toBe(200);
    expect(recoveredResult.users).toBeDefined();
    expect(recoveredResult.users!.length).toBeGreaterThan(0);

    // Confirm Redis now contains the data
    const cachedResult = await getCache<typeof recoveredResult>(CACHE_KEY);

    expect(cachedResult).not.toBeNull();
    expect(cachedResult).toEqual(recoveredResult);
  });
});