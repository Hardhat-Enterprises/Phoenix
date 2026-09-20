import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from "@jest/globals";

import {
  getCache,
} from "@phoenix/common/redis/cache";

import {
  connectRedis,
  redisClient,
} from "@phoenix/common/redis/redisClient";

import { cacheMetrics } from "@phoenix/common/redis/cacheMetrics";
import { getUsers } from "../../src/services/user.service";

describe("Redis Timeout", () => {
  beforeAll(async () => {
    const connected = await connectRedis();

    if (!connected) {
      throw new Error("Redis could not be connected");
    }
  });

  beforeEach(() => {
    cacheMetrics.reset();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });

  //create a Promise that never finishes
  it("should handle a Redis timeout", async () => {
    jest
      .spyOn(redisClient, "get")
      .mockImplementation(
        () => new Promise<string | null>(() => {})
      );

    const result = await getCache("test:timeout");

    expect(result).toBeNull();

    expect(cacheMetrics.getMetrics().timeouts).toBe(1);
  });

  it("should fallback to the database when Redis times out", async () => {
  jest
    .spyOn(redisClient, "get")
    .mockImplementation(
      () => new Promise<string | null>(() => {})
    );

    const result = await getUsers({} as any);

    expect(result.status).toBe(200);
    expect(result.users).toBeDefined();
    expect(result.users!.length).toBeGreaterThan(0);

    expect(cacheMetrics.getMetrics().timeouts).toBe(1);
    });
});