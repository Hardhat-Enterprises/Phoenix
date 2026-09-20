import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from "@jest/globals";

import {
  getUsers,
} from "../../src/services/user.service";

import {
  setCache,
  deleteCache,
} from "@phoenix/common/redis/cache";

import {
  connectRedis,
  redisClient,
} from "@phoenix/common/redis/redisClient";

describe("Cache Correctness", () => {
  const CACHE_KEY = "users:all";

  const expectedData = {
    status: 200,
    message: "Users fetched successfully",
    users: [
      {
        user_id: "1",
        username: "testuser",
        role: "user",
      },
    ],
  };

  beforeAll(async () => {
    const connected = await connectRedis();

    if (!connected) {
      throw new Error("Redis could not be connected");
    }
  });

  afterAll(async () => {
    await deleteCache(CACHE_KEY);

    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });

  it("should return the correct cached data for the users request", async () => {
    // Put the CORRECT response into Redis
    await setCache(CACHE_KEY, expectedData, 300);

    /*const incorrectCachedData = {
      status: 200,
      message: "Users fetched successfully",
      users: [
        {
          user_id: "1",
          username: "WRONG USER",
          role: "user",
        },
      ],
    };

  await setCache(CACHE_KEY, incorrectCachedData, 300);*/

    // Call the actual application service
    const result = await getUsers({} as any);

    // Verify the application returned the correct cached response
    expect(result).toEqual(expectedData);
  });
});