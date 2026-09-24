import { cacheService, EventStatus, createCacheKey, logger, HttpStatusCode } from "@phoenix/common";
import { getEventStatuses } from "./user.service";

jest.mock("@phoenix/common", () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
  },
  EventStatus: {
    findAll: jest.fn(),
  },
  createCacheKey: (service: string, resource: string, identifier: string) =>
    `phoenix:test:${service}:${resource}:${identifier}`,
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
  HttpStatusCode: {
    HTTP_STATUS_OK: 200,
  },
}));

const mockedCache = cacheService as jest.Mocked<typeof cacheService>;
const mockedEventStatus = EventStatus as jest.Mocked<typeof EventStatus>;

describe("getEventStatuses caching", () => {
  const CACHE_KEY = createCacheKey("user-service", "event-statuses", "all");

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns cached data and does not query the database on a cache hit", async () => {
    const cached = [
      { event_status_id: 1, event_status_description: "Active" },
    ];
    mockedCache.get.mockResolvedValue(cached);

    const result = await getEventStatuses();

    expect(result.eventStatuses).toEqual(cached);
    expect(mockedCache.get).toHaveBeenCalledWith(CACHE_KEY);
    expect(mockedEventStatus.findAll).not.toHaveBeenCalled();
  });

  it("queries the database and populates the cache on a cache miss", async () => {
    const dbRows = [
      { event_status_id: 2, event_status_description: "Resolved" },
    ];
    mockedCache.get.mockResolvedValue(null);
    mockedEventStatus.findAll.mockResolvedValue(dbRows as never);

    const result = await getEventStatuses();

    expect(result.eventStatuses).toEqual(dbRows);
    expect(mockedEventStatus.findAll).toHaveBeenCalledTimes(1);
    expect(mockedCache.set).toHaveBeenCalledWith(CACHE_KEY, dbRows, 3600);
  });

  it("falls back to the database when the cache read fails", async () => {
    const dbRows = [
      { event_status_id: 3, event_status_description: "Archived" },
    ];
    mockedCache.get.mockResolvedValue(null);
    mockedEventStatus.findAll.mockResolvedValue(dbRows as never);

    const result = await getEventStatuses();

    expect(result.eventStatuses).toEqual(dbRows);
    expect(result.status).toBeDefined();
  });
});