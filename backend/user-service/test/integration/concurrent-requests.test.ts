import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  jest,
} from "@jest/globals";

import { getUsers } from "../../src/services/user.service";

import {
  connectRedis,
  redisClient,
} from "@phoenix/common/redis/redisClient";

import {
  getCache,
  deleteCache,
} from "@phoenix/common/redis/cache";

import { UserAccount } from "@phoenix/common";

import { cacheMetrics } from "@phoenix/common/redis/cacheMetrics";


describe("Concurrent Requests", () => {
  beforeAll(async () => {
    const connected = await connectRedis();

    if (!connected) {
      throw new Error("Redis could not be connected");
    }
  });

  afterAll(async () => {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });

    it("should handle multiple concurrent requests successfully", async () => {
    const requests = Array.from(
        { length: 20 },
        () => getUsers({} as any),
    );

    const results = await Promise.all(requests);

    expect(results).toHaveLength(20);

    for (const result of results) {
        expect(result.status).toBe(200);
        expect(result.users).toBeDefined();
    }
    });

    it("should handle multiple concurrent cache misses", async () => {
    const CACHE_KEY = "users:all";

    await deleteCache(CACHE_KEY);
    cacheMetrics.reset();

    const requests = Array.from(
        { length: 20 },
        () => getUsers({} as any),
    );

    const results = await Promise.all(requests);

    expect(results).toHaveLength(20);

    for (const result of results) {
        expect(result.status).toBe(200);
        expect(result.users).toBeDefined();
        expect(result.users!.length).toBeGreaterThan(0);
    }

    expect(cacheMetrics.getMetrics().misses).toBeGreaterThan(0);
    });

    it("should avoid repeated database queries during simultaneous cache misses", async () => {
    const CACHE_KEY = "users:all";

    await deleteCache(CACHE_KEY);

    const dbSpy = jest.spyOn(UserAccount, "findAll");

    const requests = Array.from(
        { length: 20 },
        () => getUsers({} as any),
    );

    const results = await Promise.all(requests);

    expect(results).toHaveLength(20);

    for (const result of results) {
        expect(result.status).toBe(200);
        expect(result.users).toBeDefined();
    }

    expect(dbSpy).toHaveBeenCalledTimes(1);

    dbSpy.mockRestore();
    });

    it("should handle cache invalidation under concurrent load", async () => {
    const CACHE_KEY = "users:all";

    // Populate the cache first
    await deleteCache(CACHE_KEY);

    const firstResult = await getUsers({} as any);

    expect(firstResult.status).toBe(200);
    expect(firstResult.users).toBeDefined();

    // Invalidate the cache
    const deleted = await deleteCache(CACHE_KEY);

    expect(deleted).toBe(true);

    // Now send concurrent requests after invalidation
    const requests = Array.from(
    { length: 20 },
    () => getUsers({} as any),
    );

    const results = await Promise.all(requests);

    expect(results).toHaveLength(20);

    for (const result of results) {
    expect(result.status).toBe(200);
    expect(result.users).toBeDefined();
    }

    // The concurrent requests should have repopulated the cache
    const cachedResult = await getCache<typeof firstResult>(CACHE_KEY);

    expect(cachedResult).not.toBeNull();
    });
});