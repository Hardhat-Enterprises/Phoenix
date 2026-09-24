import { createCacheKey } from "./cache-key";

describe("createCacheKey", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("builds a key in the correct phoenix:{env}:{service}:{resource}:{id} format", () => {
    process.env.NODE_ENV = "production";
    const key = createCacheKey("user-service", "event-statuses", "all");
    expect(key).toBe("phoenix:production:user-service:event-statuses:all");
  });

  it("defaults to 'development' when NODE_ENV is not set", () => {
    delete process.env.NODE_ENV;
    const key = createCacheKey("user-service", "event-statuses", "all");
    expect(key).toBe("phoenix:development:user-service:event-statuses:all");
  });

  it("produces different keys for different services (no collisions)", () => {
    process.env.NODE_ENV = "test";
    const key1 = createCacheKey("user-service", "event-statuses", "all");
    const key2 = createCacheKey("notification-service", "event-statuses", "all");
    expect(key1).not.toBe(key2);
  });

  it("produces different keys for different resources", () => {
    process.env.NODE_ENV = "test";
    const key1 = createCacheKey("user-service", "event-statuses", "all");
    const key2 = createCacheKey("user-service", "locations", "all");
    expect(key1).not.toBe(key2);
  });

  it("produces different keys for different identifiers", () => {
    process.env.NODE_ENV = "test";
    const key1 = createCacheKey("user-service", "users", "abc-123");
    const key2 = createCacheKey("user-service", "users", "xyz-789");
    expect(key1).not.toBe(key2);
  });

  it("keeps environment separated between different NODE_ENV values", () => {
    process.env.NODE_ENV = "staging";
    const stagingKey = createCacheKey("user-service", "event-statuses", "all");

    process.env.NODE_ENV = "production";
    const prodKey = createCacheKey("user-service", "event-statuses", "all");

    expect(stagingKey).not.toBe(prodKey);
  });
});