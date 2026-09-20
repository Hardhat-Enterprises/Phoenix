import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
} from "@jest/globals";

import { getCache } from "@phoenix/common/redis/cache";
import { redisClient } from "@phoenix/common/redis/redisClient";
import { logger } from "@phoenix/common/config/logger";

describe("Cache Error Logging", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });
    //Pretend Redis is ready so that getCache() actually attempts redisClient.get()
    it("should log an error when Redis fails", async () => {
    jest.spyOn(redisClient, "isReady", "get").mockReturnValue(true);

    const loggerSpy = jest.spyOn(logger, "error").mockImplementation(() => logger);

    //Makes the Redis operation fail
    jest.spyOn(redisClient, "get").mockRejectedValue(new Error("Redis connection failed"));

    const result = await getCache("test:cache-error");

    expect(result).toBeNull();

    expect(loggerSpy).toHaveBeenCalledWith(
        "CACHE ERROR test:cache-error",
        {
        error: "Redis connection failed",
        },
    );
    });
});