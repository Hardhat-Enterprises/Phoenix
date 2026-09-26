const mockSecurityNotification = jest.fn();

jest.mock("../notifications/notificationService", () => ({
  sendSecurityNotification: mockSecurityNotification,
}));

jest.mock("@phoenix/common", () => ({
  UserAccount: {},
  HttpStatusCode: {
    HTTP_STATUS_FORBIDDEN: 403,
  },
}));

process.env.AUTH_JWT_SECRET ||= "admin-route-test-secret";

const { authorize } = require("./auth.middleware") as typeof import("./auth.middleware");

describe("admin authorization", () => {
  const makeResponse = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  });

  it("allows an administrator through", () => {
    const request = { user: { user_id: "admin-id", role: "admin" } };
    const response = makeResponse();
    const next = jest.fn();

    authorize(["admin"])(request as any, response as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
  });

  it("denies a non-administrator", () => {
    const request = { user: { user_id: "member-id", role: "end_user" } };
    const response = makeResponse();
    const next = jest.fn();

    authorize(["admin"])(request as any, response as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      status: 403,
      message: "Access denied",
    });
  });
});