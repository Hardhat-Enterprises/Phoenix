import { redisClient } from "../redis";
import { cacheService } from "./cache.service";

// Mock the shared redis client so these tests run without a real
// Redis instance — this is a unit test of CacheService's own logic
// (serialization, error handling, key pass-through), not an
// integration test of Redis itself.
jest.mock("../redis", () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  },
}));

const mockedRedis = redisClient as jest.Mocked<typeof redisClient>;

describe("CacheService", () => {
  describe("get", () => {
    it("returns the deserialized value on a cache hit", async () => {
      const value = { id: "abc123", name: "Test Location" };
      (mockedRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(value));

      const result = await cacheService.get("phoenix:test:locations:abc123");

      expect(result).toEqual(value);
      expect(mockedRedis.get).toHaveBeenCalledWith(
        "phoenix:test:locations:abc123",
      );
    });

    it("returns null on a cache miss", async () => {
      (mockedRedis.get as jest.Mock).mockResolvedValue(null);

      const result = await cacheService.get("phoenix:test:locations:missing");

      expect(result).toBeNull();
    });

    it("returns null and evicts the key when the cached value is malformed JSON", async () => {
      (mockedRedis.get as jest.Mock).mockResolvedValue("{not valid json");
      (mockedRedis.del as jest.Mock).mockResolvedValue(1);

      const result = await cacheService.get("phoenix:test:locations:corrupt");

      expect(result).toBeNull();
      expect(mockedRedis.del).toHaveBeenCalledWith(
        "phoenix:test:locations:corrupt",
      );
    });

    it("returns null instead of throwing when Redis errors", async () => {
      (mockedRedis.get as jest.Mock).mockRejectedValue(
        new Error("connection refused"),
      );

      const result = await cacheService.get("phoenix:test:locations:down");

      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("serializes the value and sets it with the given TTL", async () => {
      (mockedRedis.set as jest.Mock).mockResolvedValue("OK");
      const value = { id: "1", name: "Melbourne" };

      await cacheService.set("phoenix:test:locations:1", value, 300);

      expect(mockedRedis.set).toHaveBeenCalledWith(
        "phoenix:test:locations:1",
        JSON.stringify(value),
        "EX",
        300,
      );
    });

    it("swallows Redis errors rather than throwing", async () => {
      (mockedRedis.set as jest.Mock).mockRejectedValue(
        new Error("connection refused"),
      );

      await expect(
        cacheService.set("phoenix:test:locations:1", { a: 1 }, 60),
      ).resolves.toBeUndefined();
    });
  });

  describe("delete", () => {
    it("deletes the given key", async () => {
      (mockedRedis.del as jest.Mock).mockResolvedValue(1);

      await cacheService.delete("phoenix:test:locations:1");

      expect(mockedRedis.del).toHaveBeenCalledWith("phoenix:test:locations:1");
    });
  });

  describe("deleteMany", () => {
    it("deletes multiple keys in one call", async () => {
      (mockedRedis.del as jest.Mock).mockResolvedValue(2);

      await cacheService.deleteMany([
        "phoenix:test:locations:1",
        "phoenix:test:locations:2",
      ]);

      expect(mockedRedis.del).toHaveBeenCalledWith(
        "phoenix:test:locations:1",
        "phoenix:test:locations:2",
      );
    });

    it("does not call Redis when given an empty array", async () => {
      await cacheService.deleteMany([]);

      expect(mockedRedis.del).not.toHaveBeenCalled();
    });
  });

  describe("exists", () => {
    it("returns true when the key exists", async () => {
      (mockedRedis.exists as jest.Mock).mockResolvedValue(1);

      const result = await cacheService.exists("phoenix:test:locations:1");

      expect(result).toBe(true);
    });

    it("returns false when the key does not exist", async () => {
      (mockedRedis.exists as jest.Mock).mockResolvedValue(0);

      const result = await cacheService.exists("phoenix:test:locations:missing");

      expect(result).toBe(false);
    });

    it("returns false instead of throwing when Redis errors", async () => {
      (mockedRedis.exists as jest.Mock).mockRejectedValue(
        new Error("connection refused"),
      );

      const result = await cacheService.exists("phoenix:test:locations:down");

      expect(result).toBe(false);
    });
  });
});