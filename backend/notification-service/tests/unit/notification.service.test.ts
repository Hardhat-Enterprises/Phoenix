import {
  getHealth,
  getNotifications,
} from "../../src/services/notification.service";

import {
  GetHealthDto,
  GetNotificationsDto,
} from "../../src/dto/notification.dto";

describe("Notification Service", () => {
  describe("getHealth", () => {
    it("should return a successful health response", () => {
      const dto = new GetHealthDto();

      const result = getHealth(dto);

      expect(result.status).toBe(200);
      expect(result.message).toBe("Notification service is running");
    });
  });

  describe("getNotifications", () => {
    it("should return notifications successfully", () => {
      const dto = new GetNotificationsDto();

      const result = getNotifications(dto);

      expect(result.status).toBe(200);
      expect(result.message).toBe("Notifications Fetched Successfully");
    });
  });
});