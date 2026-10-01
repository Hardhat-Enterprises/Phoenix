jest.mock("@phoenix/common", () => ({
  HttpStatusCode: {
    HTTP_STATUS_OK: 200,
    HTTP_STATUS_INTERNAL_SERVER_ERROR: 500,
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../services/notification.service", () => ({
  getHealth: jest.fn(),
  getNotifications: jest.fn(),
}));

import { notificationHandler } from "./notification.handler";
import {
  getHealth,
  getNotifications,
} from "../services/notification.service";

describe("Notification Service gRPC Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the health response", () => {
    (getHealth as jest.Mock).mockReturnValue({
      status: 200,
      message: "Notification service is running",
    });

    const callback = jest.fn();

    notificationHandler.GetNotificationHealth(
      { request: {} } as any,
      callback,
    );

    expect(getHealth).toHaveBeenCalledWith({});
    expect(callback).toHaveBeenCalledWith(null, {
      status: 200,
      message: "Notification service is running",
    });
  });

  it("should return the notifications response", () => {
    (getNotifications as jest.Mock).mockReturnValue({
      status: 200,
      message: "Notifications fetched successfully",
    });

    const callback = jest.fn();

    notificationHandler.GetNotifications(
      { request: {} } as any,
      callback,
    );

    expect(getNotifications).toHaveBeenCalledWith({});
    expect(callback).toHaveBeenCalledWith(null, {
      status: 200,
      message: "Notifications fetched successfully",
    });
  });

  it("should return an internal server error when health check fails", () => {
    (getHealth as jest.Mock).mockImplementation(() => {
      throw new Error("Health check failed");
    });

    const callback = jest.fn();

    notificationHandler.GetNotificationHealth(
      { request: {} } as any,
      callback,
    );

    expect(getHealth).toHaveBeenCalledWith({});
    expect(callback).toHaveBeenCalledWith({
      code: 13,
      message: "Internal server error",
    });
  });

  it("should return an internal server error when fetching notifications fails", () => {
    (getNotifications as jest.Mock).mockImplementation(() => {
      throw new Error("Database error");
    });

    const callback = jest.fn();

    notificationHandler.GetNotifications(
      { request: {} } as any,
      callback,
    );

    expect(getNotifications).toHaveBeenCalledWith({});
    expect(callback).toHaveBeenCalledWith({
      code: 13,
      message: "Internal server error",
    });
  });
});
