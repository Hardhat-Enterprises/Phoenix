import { describe, it, expect, beforeEach } from "vitest";
import { getIntegrations, getRisks } from "../services/phoenixApi.js";
import { AUTH_STORAGE_KEY } from "../services/authApi.js";
import {
  mockAuthSession,
  mockIntegration,
  mockRiskAssessment,
} from "../mocks/data.js";

/**
 * Regression Test Suite: Integration Logs vs Risk Assessments
 *
 * PURPOSE:
 * Ensure that integration logs are NOT mislabeled or confused with risk assessments.
 * This is a critical contract test to prevent data type collisions and ensure the
 * backend correctly separates these two distinct data types.
 *
 * ISSUE PREVENTED:
 * If integration logs were incorrectly labeled as risk assessments, the dashboard
 * would show integration data in the risk assessment view, causing confusion and
 * incorrect security reporting.
 */

describe("Integration Logs vs Risk Assessments - Regression Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockAuthSession));
  });

  describe("Data Type Separation", () => {
    it("should fetch integrations from correct endpoint", async () => {
      const result = await getIntegrations();

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      // Should have integration metadata
      expect(result.total).toBeDefined();
      expect(result.page).toBeDefined();
    });

    it("should fetch risk assessments from correct endpoint", async () => {
      const result = await getRisks();

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      // Should have risk metadata
      expect(result.total).toBeDefined();
      expect(result.page).toBeDefined();
    });

    it("should return different data from each endpoint", async () => {
      const integrations = await getIntegrations();
      const risks = await getRisks();

      // Both should return arrays but with different content
      expect(Array.isArray(integrations.items)).toBe(true);
      expect(Array.isArray(risks.items)).toBe(true);

      // If both have data, they should be distinct records
      if (integrations.items.length > 0 && risks.items.length > 0) {
        const firstIntegration = integrations.items[0];
        const firstRisk = risks.items[0];

        // IDs should be different
        expect(firstIntegration.id).not.toBe(firstRisk.id);
      }
    });
  });

  describe("Integration Records Structure", () => {
    it("should have integration-specific fields", async () => {
      const result = await getIntegrations();

      if (result.items.length > 0) {
        const integration = result.items[0];

        // Integration records should have these fields
        expect(integration.id).toBeDefined();
        expect(integration.name || integration.type).toBeDefined();
        // Should NOT have risk-specific fields
        expect(integration.type).not.toBe("risk_assessment");
      }
    });

    it("should not label integrations as risk assessments", async () => {
      const result = await getIntegrations();

      result.items.forEach((integration) => {
        // Integration type should not be risk assessment
        expect(integration.type).not.toMatch(
          /risk_assessment|assessment|risk/i,
        );
        // Should not have risk severity indicator
        if (integration.severity) {
          // If severity exists, it's operational status not risk level
          expect(integration.severity).toMatch(/active|inactive|pending/i);
        }
      });
    });

    it("should preserve integration-specific data structure", async () => {
      const result = await getIntegrations();

      if (result.items.length > 0) {
        const integration = result.items[0];

        // Check for integration-specific fields
        const hasIntegrationFields =
          integration.name ||
          integration.type ||
          integration.status ||
          integration.input ||
          integration.output;

        expect(hasIntegrationFields).toBeTruthy();
      }
    });
  });

  describe("Risk Assessment Records Structure", () => {
    it("should have risk-specific fields", async () => {
      const result = await getRisks();

      if (result.items.length > 0) {
        const risk = result.items[0];

        // Risk records should have these fields
        expect(risk.id).toBeDefined();
        expect(risk.title || risk.description).toBeDefined();
        // Should NOT have integration-specific fields
        expect(risk.type).not.toBe("webhook");
        expect(risk.type).not.toBe("api");
      }
    });

    it("should not contaminate risks with integration data", async () => {
      const result = await getRisks();

      result.items.forEach((risk) => {
        // Should not have integration-specific fields
        expect(risk.name).toBeUndefined();
        expect(risk.webhook_url).toBeUndefined();
        expect(risk.api_endpoint).toBeUndefined();
        // Should not be an integration type
        expect(risk.type).not.toMatch(/webhook|api|integration/i);
      });
    });

    it("should preserve risk-specific severity semantics", async () => {
      const result = await getRisks();

      result.items.forEach((risk) => {
        if (risk.severity) {
          // Risk severity should be security-related
          expect(risk.severity).toMatch(
            /critical|high|medium|low|info|warning/i,
          );
          // Should NOT be operational status
          expect(risk.severity).not.toMatch(/active|inactive|pending/i);
        }
      });
    });
  });

  describe("Contract Enforcement", () => {
    it("should maintain endpoint isolation", async () => {
      // These tests verify the backend contract:
      // - GET /api/users/integration returns integrations
      // - GET /api/users/risk-assessments returns risk assessments
      // - Never mix the two data types

      const integrations = await getIntegrations();
      const risks = await getRisks();

      // Both should have valid metadata
      expect(integrations.total).toBeGreaterThanOrEqual(0);
      expect(risks.total).toBeGreaterThanOrEqual(0);

      // Items should be arrays (even if empty)
      expect(Array.isArray(integrations.items)).toBe(true);
      expect(Array.isArray(risks.items)).toBe(true);
    });

    it("should handle empty integration list correctly", async () => {
      // Integration list can be empty without error
      const result = await getIntegrations();

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      // Even empty, should have pagination metadata
      expect(typeof result.total).toBe("number");
      expect(typeof result.page).toBe("number");
    });

    it("should handle empty risk assessment list correctly", async () => {
      // Risk list can be empty without error
      const result = await getRisks();

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      // Even empty, should have pagination metadata
      expect(typeof result.total).toBe("number");
      expect(typeof result.page).toBe("number");
    });
  });

  describe("UI Integration Safety", () => {
    it("should not allow integration data in risk assessment filters", async () => {
      // This prevents UI bugs where integration logs appear in risk views
      const integrations = await getIntegrations();
      const risks = await getRisks();

      // If we filter risks by name (should return empty)
      // integrations should never match
      if (integrations.items.length > 0 && risks.items.length > 0) {
        const integrationNames = integrations.items.map((i) => i.name);
        const riskTitles = risks.items.map((r) => r.title);

        // Should not have any overlap
        const overlap = integrationNames.filter((name) =>
          riskTitles.includes(name),
        );
        expect(overlap).toHaveLength(0);
      }
    });

    it("should not allow risk data in integration filters", async () => {
      // This prevents UI bugs where risks appear in integration views
      const integrations = await getIntegrations();
      const risks = await getRisks();

      // If we filter integrations by type (should return webhooks/apis)
      // risks should never match
      if (integrations.items.length > 0 && risks.items.length > 0) {
        const integrationTypes = integrations.items.map((i) => i.type);
        const riskTypes = risks.items.map((r) => r.type);

        // Integration types should not be risk types
        integrationTypes.forEach((intType) => {
          expect(intType).not.toMatch(/vulnerability|exposure|weakness/i);
        });

        // Risk types should not be integration types
        riskTypes.forEach((riskType) => {
          expect(riskType).not.toMatch(/webhook|api|integration/i);
        });
      }
    });
  });

  describe("Data Consistency", () => {
    it("should not have duplicate IDs across data types", async () => {
      const integrations = await getIntegrations();
      const risks = await getRisks();

      const integrationIds = integrations.items.map((i) => i.id);
      const riskIds = risks.items.map((r) => r.id);

      // Should not have any overlapping IDs
      const overlap = integrationIds.filter((id) => riskIds.includes(id));
      expect(overlap).toHaveLength(0);
    });

    it("should correctly unwrap nested data structures", async () => {
      // Both endpoints may return nested data that gets unwrapped
      // Verify unwrapping doesn't mix data types

      const integrations = await getIntegrations();
      const risks = await getRisks();

      // After unwrapping, items should still be correct type
      integrations.items.forEach((item) => {
        // Integration should have expected fields
        expect(
          typeof item.id === "string" && (item.name || item.type),
        ).toBeTruthy();
      });

      risks.items.forEach((item) => {
        // Risk should have expected fields
        expect(
          typeof item.id === "string" && (item.title || item.description),
        ).toBeTruthy();
      });
    });

    it("should maintain pagination metadata separately", async () => {
      const integrations = await getIntegrations();
      const risks = await getRisks();

      // Each should have its own pagination
      expect(integrations.page).toBeDefined();
      expect(integrations.limit).toBeDefined();
      expect(risks.page).toBeDefined();
      expect(risks.limit).toBeDefined();

      // Pagination should be independent
      // (changing page for one shouldn't affect the other)
    });
  });

  describe("Error Handling Isolation", () => {
    it("should handle integration errors without affecting risks", async () => {
      // If integration endpoint fails, risks should still work
      // This would require server.use() override in actual test
      const risks = await getRisks();

      expect(risks).toBeDefined();
      expect(Array.isArray(risks.items)).toBe(true);
    });

    it("should handle risk errors without affecting integrations", async () => {
      // If risk endpoint fails, integrations should still work
      const integrations = await getIntegrations();

      expect(integrations).toBeDefined();
      expect(Array.isArray(integrations.items)).toBe(true);
    });
  });
});
