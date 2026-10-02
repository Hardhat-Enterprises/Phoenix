import {
  describe,
  it,
  expect,
  afterEach,
  jest,
} from "@jest/globals";

import { getUsers } from "../../src/services/user.service";
import * as cache from "@phoenix/common/redis/cache";

import { UserAccount } from "@phoenix/common";

describe("Redis Failure Fallback", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

it("should fallback to database when Redis is unavailable", async () => {
    const findAllSpy = jest.spyOn(UserAccount, "findAll");
  
    jest.spyOn(cache, "getCache").mockRejectedValue(new Error("Redis unavailable"));
  
    const result = await getUsers({} as any);

    expect(result).toBeDefined();
    //Will pass
    expect(result.status).toBe(200);
    //Will fail
    //expect(result.status).toBe(500);
    expect(result.users).toBeDefined();
    expect(result.users!.length).toBeGreaterThan(0);
    expect(findAllSpy).toHaveBeenCalled();
  });
});