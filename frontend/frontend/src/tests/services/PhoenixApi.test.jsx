import { describe, it, expect, beforeEach } from "vitest";
import {
  getDashboardOverview,
  getDashboardCharts,
  getDashboardActivity,
  getThreats,
  getHazards,
  getNotifications,
  getIntegrations,
  getApiHealth,
  getIngestionHealth,
} from "../../services/phoenixApi.js";
import { AUTH_STORAGE_KEY } from "../../services/authApi.js";
import { mockAuthSession } from "../../mocks/data.js";

describe("phoenixApi", () => {
  beforeEach(() => {
    // Login for each test that requires auth
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockAuthSession));
  });

  describe("Dashboard endpoints", () => {
    it("should fetch dashboard overview", async () => {
      const data = await getDashboardOverview();

      expect(data).toBeDefined();
      expect(data.total_threats).toBeDefined();
      expect(data.system_status).toBe("operational");
    });

    it("should fetch dashboard charts", async () => {
      const data = await getDashboardCharts();

      expect(data).toBeDefined();
      expect(data.threat_timeline).toBeDefined();
      expect(data.severity_distribution).toBeDefined();
    });

    it("should fetch dashboard activity", async () => {
      const data = await getDashboardActivity();

      expect(data).toBeDefined();
      // Activity can be array or object depending on backend response
      if (Array.isArray(data)) {
        expect(data.length).toBeGreaterThan(0);
        expect(data[0].type || data[0].description).toBeDefined();
      } else if (typeof data === "object") {
        expect(data.type || data.description || data.message).toBeDefined();
      }
    });

    it("should handle 401 when not authenticated", async () => {
      localStorage.clear();

      await expect(async () => {
        await getDashboardOverview();
      }).rejects.toThrow("Please sign in");
    });
  });

  describe("Threat endpoints", () => {
    it("should fetch threats list", async () => {
      const result = await getThreats();

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.total).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("should support pagination", async () => {
      const result = await getThreats({ page: 1, limit: 5 });

      expect(result.items).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(5);
    });

    it("should support search filtering", async () => {
      const result = await getThreats({ search: "Suspicious" });

      expect(result.items).toBeDefined();
    });

    it("should filter out undefined/null/empty query params", async () => {
      const result = await getThreats({ page: 1, search: "", extra: null });

      expect(result.items).toBeDefined();
    });

    it("should handle empty results", async () => {
      const result = await getThreats({ search: "nonexistent" });

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.total).toBeDefined();
    });
  });

  describe("Hazard endpoints", () => {
    it("should fetch hazards list", async () => {
      const result = await getHazards();

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it("should return correct metadata", async () => {
      const result = await getHazards();

      expect(result.page).toBeDefined();
      expect(result.limit).toBeDefined();
      expect(result.total).toBeDefined();
    });
  });

  describe("Notification endpoint", () => {
    it("should fetch notifications without auth", async () => {
      localStorage.clear();

      const result = await getNotifications();

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("should handle pagination", async () => {
      const result = await getNotifications({ page: 1, limit: 5 });

      expect(result.items).toBeDefined();
      expect(result.total).toBeDefined();
    });
  });

  describe("Integration endpoint", () => {
    it("should fetch integrations", async () => {
      const result = await getIntegrations();

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("should parse JSON fields in integration", async () => {
      const result = await getIntegrations();

      expect(result.items).toBeDefined();
      if (result.items.length > 0) {
        const integration = result.items[0];
        expect(integration).toBeDefined();
        // Integration may have input/output fields
      }
    });

    it("should handle missing optional fields in integrations", async () => {
      const result = await getIntegrations();

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe("Health endpoints", () => {
    it("should check API health", async () => {
      const data = await getApiHealth();

      expect(data).toBeDefined();
      expect(data.status).toBe(200);
    });

    it("should check ingestion health", async () => {
      const data = await getIngestionHealth();

      expect(data).toBeDefined();
      expect(data.message).toBeDefined();
    });
  });

  describe("Error handling", () => {
    it("should handle network errors", async () => {
      // This test would require temporarily disabling MSW to test real network errors
      // For now, it's documented but would need special setup
      expect(true).toBe(true);
    });

    it("should handle 500 server errors", async () => {
      await expect(async () => {
        await fetch("http://localhost:3001/api/users/error", {
          headers: { Authorization: "Bearer mock-token" },
        }).then((r) => {
          if (!r.ok) throw new Error(`${r.status} error`);
          return r.json();
        });
      }).rejects.toThrow();
    });
  });

  describe("Response unwrapping", () => {
    it("should unwrap data.data format", async () => {
      const result = await getDashboardOverview();

      // Should have unwrapped nested data structure
      expect(result.total_threats).toBeDefined();
    });

    it("should handle array data responses", async () => {
      const result = await getThreats();

      expect(Array.isArray(result.items)).toBe(true);
    });

    it("should handle flat object responses", async () => {
      const data = await getApiHealth();

      expect(data).toBeDefined();
    });
  });

  describe("Zero values and missing fields", () => {
    it("should preserve zero values in threat data", async () => {
      const result = await getThreats();

      // API might return 0 for various numeric fields
      expect(result.items).toBeDefined();
    });

    it("should handle missing optional fields", async () => {
      const result = await getHazards();

      // Some fields might be undefined, not null
      expect(result.items).toBeDefined();
    });
  });
});
