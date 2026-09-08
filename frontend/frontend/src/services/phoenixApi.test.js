import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { apiRequest } from "./authApi";

import {
  getApiHealth,
  getDashboardActivity,
  getDashboardCharts,
  getDashboardOverview,
  getEventStatuses,
  getHazards,
  getIngestionHealth,
  getIntegrations,
  getLinkedEventTypes,
  getLocations,
  getRisks,
  getThreats,
  postIngestionAnomaly,
  postIngestionCore,
} from "./phoenixApi";

vi.mock("./authApi", () => ({
  apiRequest: vi.fn(),
}));

describe("phoenixApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Dashboard API methods", () => {
    it("gets dashboard overview", async () => {
      apiRequest.mockResolvedValue({
        data: {
          total_hazards: 5,
          total_threats: 8,
          total_risks: 3,
        },
      });

      const result = await getDashboardOverview();

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/users/dashboard/overview",
        {
          requiresAuth: true,
        },
      );

      expect(result).toEqual({
        total_hazards: 5,
        total_threats: 8,
        total_risks: 3,
      });
    });

    it("gets dashboard charts", async () => {
      apiRequest.mockResolvedValue({
        data: {
          threats_by_risk_level: {
            high: 2,
            medium: 3,
          },
        },
      });

      const result = await getDashboardCharts();

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/users/dashboard/charts",
        {
          requiresAuth: true,
        },
      );

      expect(result.threats_by_risk_level).toEqual({
        high: 2,
        medium: 3,
      });
    });

    it("gets dashboard activity", async () => {
      apiRequest.mockResolvedValue({
        data: {
          recent_threats: [
            {
              threat_id: "threat-1",
              title: "Phishing detected",
            },
          ],
        },
      });

      const result = await getDashboardActivity();

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/users/dashboard/activity",
        {
          requiresAuth: true,
        },
      );

      expect(result.recent_threats).toHaveLength(1);
    });
  });

  describe("Health methods", () => {
    it("gets API health without authentication", async () => {
      apiRequest.mockResolvedValue({
        message: "API service is running",
      });

      const result = await getApiHealth();

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/users/health",
        {
          requiresAuth: false,
        },
      );

      expect(result.message).toBe(
        "API service is running",
      );
    });

    it("gets ingestion health", async () => {
      apiRequest.mockResolvedValue({
        message: "Ingestion service running",
      });

      const result = await getIngestionHealth();

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/ingestion/health",
      );

      expect(result.message).toBe(
        "Ingestion service running",
      );
    });
  });

  describe("Threat methods", () => {
    it("gets threats with query parameters", async () => {
      apiRequest.mockResolvedValue({
        threats: [
          {
            threat_id: "threat-1",
            title: "Test threat",
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await getThreats({
        risk_level: "high",
        page: 1,
        limit: 10,
      });

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/users/threats?risk_level=high&page=1&limit=10",
        {
          requiresAuth: true,
        },
      );

      expect(result).toEqual({
        items: [
          {
            threat_id: "threat-1",
            title: "Test threat",
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it("returns an empty threat list", async () => {
      apiRequest.mockResolvedValue({
        threats: [],
        total: 0,
      });

      const result = await getThreats();

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("does not add empty query parameters", async () => {
      apiRequest.mockResolvedValue({
        threats: [],
      });

      await getThreats({
        risk_level: "",
        status: null,
        page: undefined,
      });

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/users/threats",
        {
          requiresAuth: true,
        },
      );
    });
  });

  describe("Hazard methods", () => {
    it("gets hazards", async () => {
      apiRequest.mockResolvedValue({
        hazards: [
          {
            hazard_event_id: "hazard-1",
            hazard_type: "flood",
          },
        ],
        total: 1,
      });

      const result = await getHazards({
        page: 1,
        limit: 4,
      });

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/users/hazards?page=1&limit=4",
        {
          requiresAuth: true,
        },
      );

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("handles empty hazards", async () => {
      apiRequest.mockResolvedValue({
        hazards: [],
      });

      const result = await getHazards();

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("Location methods", () => {
    it("gets location metadata", async () => {
      apiRequest.mockResolvedValue({
        locations: [
          {
            state_region: "Victoria",
            suburb: "Melbourne",
          },
        ],
      });

      const result = await getLocations();

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/users/meta/locations",
        {
          requiresAuth: true,
        },
      );

      expect(result).toHaveLength(1);
    });

    it("returns an empty location list when no locations exist", async () => {
      apiRequest.mockResolvedValue({});

      const result = await getLocations();

      expect(result).toEqual([]);
    });
  });

  describe("Integration methods", () => {
    it("gets integrations", async () => {
      apiRequest.mockResolvedValue({
        integrations: [
          {
            integration_event_id: "integration-1",
            input: "{\"region_id\":\"VIC_GIPPSLAND\"}",
            output: "{\"risk_level\":\"high\"}",
          },
        ],
        total: 1,
      });

      const result = await getIntegrations({
        page: 1,
        limit: 25,
      });

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/users/integration?page=1&limit=25",
        {
          requiresAuth: true,
        },
      );

      expect(result.items).toHaveLength(1);

      expect(result.items[0].input).toEqual({
        region_id: "VIC_GIPPSLAND",
      });

      expect(result.items[0].output).toEqual({
        risk_level: "high",
      });
    });

    it("keeps invalid JSON fields unchanged", async () => {
      apiRequest.mockResolvedValue({
        integrations: [
          {
            input: "not-json",
            output: "not-json",
          },
        ],
      });

      const result = await getIntegrations();

      expect(result.items[0].input).toBe("not-json");
      expect(result.items[0].output).toBe("not-json");
    });
  });

  describe("Risk methods", () => {
    it("gets risk assessments from the primary endpoint", async () => {
      apiRequest.mockResolvedValue({
        risk_assessments: [
          {
            id: "risk-1",
          },
        ],
        total: 1,
      });

      const result = await getRisks({
        page: 1,
        limit: 25,
      });

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/users/risk-assessments?page=1&limit=25",
        {
          requiresAuth: true,
        },
      );

      expect(result.items).toHaveLength(1);
    });

    it("falls back to integrations when risk assessments return 404", async () => {
      apiRequest
        .mockRejectedValueOnce({
          status: 404,
          message: "Not found",
        })
        .mockResolvedValueOnce({
          integrations: [
            {
              integration_event_id: "integration-1",
            },
          ],
          total: 1,
        });

      const result = await getRisks({
        page: 1,
      });

      expect(apiRequest).toHaveBeenNthCalledWith(
        1,
        "/api/users/risk-assessments?page=1",
        {
          requiresAuth: true,
        },
      );

      expect(apiRequest).toHaveBeenNthCalledWith(
        2,
        "/api/users/integration?page=1",
        {
          requiresAuth: true,
        },
      );

      expect(result.items).toHaveLength(1);
    });

    it("does not hide non-404 risk errors", async () => {
      const serverError = {
        status: 500,
        message: "Server error",
      };

      apiRequest.mockRejectedValue(serverError);

      await expect(
        getRisks(),
      ).rejects.toEqual(serverError);

      expect(apiRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe("Metadata methods", () => {
    it("gets linked event types", async () => {
      apiRequest.mockResolvedValue({
        linked_event_types: [
          "hazard",
          "cyber",
        ],
      });

      const result = await getLinkedEventTypes();

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/users/meta/linked-event-types",
        {
          requiresAuth: true,
        },
      );

      expect(result).toEqual([
        "hazard",
        "cyber",
      ]);
    });

    it("gets event statuses", async () => {
      apiRequest.mockResolvedValue({
        event_statuses: [
          "active",
          "resolved",
        ],
      });

      const result = await getEventStatuses();

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/users/meta/event-statuses",
        {
          requiresAuth: true,
        },
      );

      expect(result).toEqual([
        "active",
        "resolved",
      ]);
    });
  });

  describe("Ingestion methods", () => {
    it("posts core ingestion data", async () => {
      const payload = {
        event_id: "event-1",
      };

      apiRequest.mockResolvedValue({
        status: 200,
      });

      await postIngestionCore(payload);

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/ingestion/core",
        {
          method: "POST",
          body: payload,
          requiresAuth: true,
        },
      );
    });

    it("marks the anomaly endpoint as unavailable after a 404", async () => {
      const error = {
        status: 404,
        message: "Not found",
      };

      apiRequest.mockRejectedValue(error);

      await expect(
        postIngestionAnomaly({
          region_id: "VIC_GIPPSLAND",
        }),
      ).rejects.toMatchObject({
        status: 404,
        code: "ANOMALY_ENDPOINT_UNAVAILABLE",
      });
    });

    it("does not change unrelated anomaly errors", async () => {
      const error = {
        status: 500,
        message: "Server failure",
      };

      apiRequest.mockRejectedValue(error);

      await expect(
        postIngestionAnomaly({}),
      ).rejects.toEqual(error);

      expect(error.code).toBeUndefined();
    });
  });

  describe("API error propagation", () => {
    it.each([
      [400, "Bad request"],
      [401, "Unauthorised"],
      [403, "Forbidden"],
      [404, "Not found"],
      [500, "Server error"],
    ])(
      "propagates HTTP %s errors from apiRequest",
      async (status, message) => {
        const error = {
          status,
          message,
        };

        apiRequest.mockRejectedValue(error);

        await expect(
          getThreats(),
        ).rejects.toEqual(error);
      },
    );
  });
});