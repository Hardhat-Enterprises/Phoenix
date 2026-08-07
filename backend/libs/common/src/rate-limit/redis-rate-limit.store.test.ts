import assert from "assert";

import { buildRateLimitKey } from "./rate-limit-key";
import {
  RedisEvalClient,
  RedisRateLimitStore,
} from "./redis-rate-limit.store";

class FakeRedisClient implements RedisEvalClient {
  private readonly counters = new Map<string, number>();

  async eval(
    _script: string,
    _numberOfKeys: number,
    key: string,
    windowSeconds: string,
  ): Promise<[number, number]> {
    const currentCount = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, currentCount);

    return [currentCount, Number(windowSeconds)];
  }
}

const runTest = async (
  testName: string,
  testFunction: () => void | Promise<void>,
): Promise<void> => {
  try {
    await testFunction();
    console.log(`PASS: ${testName}`);
  } catch (error) {
    console.error(`FAIL: ${testName}`);
    console.error(error);
    process.exitCode = 1;
  }
};

const runTests = async (): Promise<void> => {
  await runTest("buildRateLimitKey creates a consistent key", () => {
    const key = buildRateLimitKey({
      environment: "development",
      policy: "authenticated-user",
      clientIdentifier: "user@example.com",
    });

    assert.strictEqual(
      key,
      "phoenix:ratelimit:development:authenticated-user:user%40example.com",
    );
  });

  await runTest("consume calculates remaining requests", async () => {
    const store = new RedisRateLimitStore(new FakeRedisClient());

    const firstResult = await store.consume("test:user:1", 2, 60);
    const secondResult = await store.consume("test:user:1", 2, 60);
    const thirdResult = await store.consume("test:user:1", 2, 60);

    assert.strictEqual(firstResult.allowed, true);
    assert.strictEqual(firstResult.remaining, 1);

    assert.strictEqual(secondResult.allowed, true);
    assert.strictEqual(secondResult.remaining, 0);

    assert.strictEqual(thirdResult.allowed, false);
    assert.strictEqual(thirdResult.remaining, 0);
    assert.strictEqual(thirdResult.retryAfterSeconds, 60);
  });

  await runTest(
    "concurrent requests do not exceed the limit",
    async () => {
      const store = new RedisRateLimitStore(new FakeRedisClient());

      const results = await Promise.all(
        Array.from({ length: 20 }, () =>
          store.consume("test:concurrent-user", 10, 60),
        ),
      );

      const allowedRequests = results.filter(
        (result) => result.allowed,
      );
      const blockedRequests = results.filter(
        (result) => !result.allowed,
      );

      assert.strictEqual(allowedRequests.length, 10);
      assert.strictEqual(blockedRequests.length, 10);
    },
  );

  await runTest("consume rejects invalid values", async () => {
    const store = new RedisRateLimitStore(new FakeRedisClient());

    await assert.rejects(
      () => store.consume("", 10, 60),
      /key must not be empty/,
    );

    await assert.rejects(
      () => store.consume("test:key", 0, 60),
      /limit must be a positive integer/,
    );

    await assert.rejects(
      () => store.consume("test:key", 10, 0),
      /windowSeconds must be a positive integer/,
    );
  });
};

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});