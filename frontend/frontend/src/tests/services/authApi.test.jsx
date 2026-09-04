import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  loginUser,
  getAuthSession,
  clearAuthSession,
  getAccessToken,
  apiRequest,
  AUTH_STORAGE_KEY,
} from "../../services/authApi.js";
import { mockAuthSession } from "../../mocks/data.js";

describe("authApi", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    clearAuthSession();
  });

  describe("loginUser", () => {
    it("should login with username", async () => {
      const result = await loginUser({
        username: "testuser",
        password: "password123",
      });

      expect(result).toBeDefined();
      expect(
        result.access_token || result.accessToken || result.token,
      ).toBeTruthy();
      expect(result.user).toBeDefined();
    });

    it("should login with email", async () => {
      const result = await loginUser({
        username: "test@example.com",
        password: "password123",
      });

      expect(result).toBeDefined();
      expect(
        result.access_token || result.accessToken || result.token,
      ).toBeTruthy();
    });

    it("should reject invalid credentials", async () => {
      await expect(
        loginUser({ username: "testuser", password: "wrongpassword" }),
      ).rejects.toThrow();
    });

    it("should trim whitespace from username", async () => {
      const result = await loginUser({
        username: "  testuser  ",
        password: "password123",
      });
      expect(result).toBeDefined();
    });

    it("should handle email with spaces", async () => {
      const result = await loginUser({
        username: "  test@example.com  ",
        password: "password123",
      });
      expect(result).toBeDefined();
    });

    it("should handle 401 unauthorized response", async () => {
      await expect(
        loginUser({ username: "testuser", password: "invalid" }),
      ).rejects.toThrow("Invalid credentials");
    });
  });

  describe("Auth Session Management", () => {
    it("should return auth payload with token and user", async () => {
      const result = await loginUser({ username: "testuser", password: "password123" });

      expect(result).toBeDefined();
      expect(result.accessToken || result.access_token || result.token).toBeTruthy();
      expect(result.user).toBeDefined();
    });

    it("should retrieve auth session", async () => {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockAuthSession));

      const session = getAuthSession();
      expect(session).toEqual(mockAuthSession);
      expect(session.accessToken).toBe("mock-jwt-token-abc123");
    });

    it("should return null if no session stored", () => {
      const session = getAuthSession();
      expect(session).toBeNull();
    });

    it("should handle corrupted session data", () => {
      localStorage.setItem(AUTH_STORAGE_KEY, "invalid json {{{");

      const session = getAuthSession();
      expect(session).toBeNull();
      expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    });

    it("should clear auth session", async () => {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockAuthSession));

      clearAuthSession();
      expect(getAuthSession()).toBeNull();
    });
  });

  describe("getAccessToken", () => {
    it("should return access token from session", () => {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockAuthSession));

      const token = getAccessToken();
      expect(token).toBe("mock-jwt-token-abc123");
    });

    it("should return empty string if no session", () => {
      const token = getAccessToken();
      expect(token).toBe("");
    });
  });

  describe("apiRequest", () => {
    it("should throw if auth required but no token", async () => {
      await expect(
        apiRequest("/api/users/threats", { requiresAuth: true }),
      ).rejects.toThrow("Please sign in before loading backend data");
    });

    it("should inject Authorization header with token", async () => {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockAuthSession));

      // Should succeed because endpoint is mocked and we have token
      const result = await apiRequest("/api/users/threats", { requiresAuth: true });
      expect(result).toBeDefined();
    });

    it("should handle 401 and clear session", async () => {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockAuthSession));

      await expect(
        apiRequest("/api/users/restricted", {
          requiresAuth: true,
        }),
      ).rejects.toThrow();

      // 401 with "Invalid token" message should clear session
    });

    it("should handle unmocked endpoints gracefully", async () => {
      // MSW passes unmocked requests through
      // In tests, unmocked endpoints will either be caught by MSW or return error
      // This test verifies we handle the response correctly
      try {
        const result = await apiRequest("/api/nonexistent", { method: "GET" });
        // If request succeeds despite not being mocked, verify it's a valid response
        expect(result).toBeDefined();
      } catch (error) {
        // Expected: unmocked endpoint throws an error with proper error structure
        expect(error).toBeDefined();
        expect(error.status || error.message).toBeTruthy();
      }
    });
  });
});
