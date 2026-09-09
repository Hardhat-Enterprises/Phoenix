import { invalidateCache, invalidateRelatedCache } from "./cache-invalidation";
import { cacheService } from "./cache.service";

jest.mock("./cache.service", () => ({
  cacheService: {
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

const mockedCache = cacheService as jest.Mocked<typeof cacheService>;

describe("cache invalidation helpers", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("invalidateCache deletes the given key", async () => {
    await invalidateCache("phoenix:test:user-service:event-statuses:all");
    expect(mockedCache.delete).toHaveBeenCalledWith(
      "phoenix:test:user-service:event-statuses:all",
    );
  });

  it("invalidateRelatedCache deletes multiple keys at once", async () => {
    const keys = [
      "phoenix:test:user-service:users:all",
      "phoenix:test:user-service:dashboard:overview",
    ];
    await invalidateRelatedCache(keys);
    expect(mockedCache.deleteMany).toHaveBeenCalledWith(keys);
  });
});