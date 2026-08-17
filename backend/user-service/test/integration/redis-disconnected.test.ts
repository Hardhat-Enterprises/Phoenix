import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  jest,
} from "@jest/globals";

import { getUsers } from "../../src/services/user.service";

import * as cache from "@phoenix/common/redis/cache";

describe("Redis Disconnected During Operation", () => {
  beforeAll(async () => {
    // Nothing required here because we mock the cache operation.
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should fallback to the database when Redis disconnects during a request", async () => {
    jest
      .spyOn(cache, "getCache")
      .mockRejectedValue(new Error("Redis connection lost"));

    const result = await getUsers({} as any);

    expect(result).toBeDefined();
    expect(result.status).toBe(200);
    expect(result.users).toBeDefined();
    expect(result.users!.length).toBeGreaterThan(0);
  });
});