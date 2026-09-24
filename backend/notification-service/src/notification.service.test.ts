jest.mock("@phoenix/common", () => ({
  HttpStatusCode: {
    HTTP_STATUS_OK: 200,
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { getHealth, getNotifications } from "./services/notification.service";

describe("Notification Service", () => {
  describe("getHealth", () => {
    it("should return a healthy status", () => {
      const result = getHealth({});

      expect(result.status).toBe(200);
      expect(result.message).toBe("Notification service is running");
    });
  });

  describe("getNotifications", () => {
    it("should return a successful notification response", () => {
      const result = getNotifications({});

      expect(result.status).toBe(200);
      expect(result.message).toBe("Notifications fetched successfully");
    });
  });
});
