const mockUserAccount = {
  findAll: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
};
const mockCompare = jest.fn();
const mockSign = jest.fn();
const mockVerify = jest.fn();

jest.mock("@phoenix/common", () => ({
  UserAccount: mockUserAccount,
  UserRole: { ADMIN: "admin" },
  HttpStatusCode: {
    HTTP_STATUS_OK: 200,
    HTTP_STATUS_BAD_REQUEST: 400,
    HTTP_STATUS_UNAUTHORIZED: 401,
    HTTP_STATUS_NOT_FOUND: 404,
  },
  logger: { info: jest.fn(), error: jest.fn() },
  CyberThreat: {},
  HazardEvent: {},
  IntegrationLog: {},
  GeoLocation: {},
  EventStatus: {},
  LinkedEventType: {},
  Season: {},
  ReferenceDay: {},
  ReferenceTime: {},
}));

jest.mock("@phoenix/common/redis/cache", () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  deleteCache: jest.fn(),
}));

jest.mock("bcrypt", () => ({ compare: mockCompare, hash: jest.fn() }));
jest.mock("jsonwebtoken", () => ({ sign: mockSign, verify: mockVerify }));

import { HttpStatusCode, UserAccount } from "@phoenix/common";
import { disableUser, getAdminUsers, loginUser } from "./user.service";

const accountModel = UserAccount as jest.Mocked<typeof UserAccount>;
const adminId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";

describe("admin account management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerify.mockReturnValue({ user_id: adminId });
  });

  it("lists only public account and disable-audit fields", async () => {
    accountModel.findAll.mockResolvedValue([
      {
        user_id: targetId,
        username: "member",
        role: "end_user",
        is_disabled: false,
        disabled_by: null,
        disabled_at: null,
        password_hashed: "must-not-leak",
        access_token: "must-not-leak",
      } as any,
    ]);
    accountModel.findByPk.mockResolvedValue({
      user_id: adminId,
      role: "admin",
      is_disabled: false,
      access_token: "admin-token",
    } as any);

    const result = await getAdminUsers({ access_token: "admin-token" });

    expect(accountModel.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: [
          "user_id",
          "username",
          "role",
          "is_disabled",
          "disabled_by",
          "disabled_at",
        ],
      }),
    );
    expect(result.users[0]).toEqual({
      user_id: targetId,
      username: "member",
      role: "end_user",
      is_disabled: false,
      disabled_by: "",
      disabled_at: "",
    });
  });

  it("rejects a valid token belonging to a non-administrator", async () => {
    mockVerify.mockReturnValue({ user_id: targetId });
    accountModel.findByPk.mockResolvedValue({
      user_id: targetId,
      role: "end_user",
      is_disabled: false,
      access_token: "member-token",
    } as any);

    const result = await getAdminUsers({ access_token: "member-token" });

    expect(result.status).toBe(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED);
    expect(accountModel.findAll).not.toHaveBeenCalled();
  });

  it("disables an account, records actor and time, and revokes existing tokens", async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    accountModel.findByPk.mockImplementation(async (userId: any) =>
      userId === adminId
        ? ({
            user_id: adminId,
            role: "admin",
            is_disabled: false,
            access_token: "admin-token",
          } as any)
        : ({ user_id: targetId, is_disabled: false, update } as any),
    );

    const result = await disableUser({ user_id: targetId, access_token: "admin-token" });

    expect(result.status).toBe(HttpStatusCode.HTTP_STATUS_OK);
    expect(result.is_disabled).toBe(true);
    expect(result.disabled_by).toBe(adminId);
    expect(result.disabled_at).toEqual(expect.any(String));
    expect(update).toHaveBeenCalledWith({
      is_disabled: true,
      disabled_by: adminId,
      disabled_at: expect.any(Date),
      access_token: null,
      refresh_token: null,
    });
  });

  it("rejects malformed IDs and administrator self-disable before querying", async () => {
    const invalid = await disableUser({ user_id: "bad-id", access_token: "admin-token" });
    accountModel.findByPk.mockResolvedValue({
      user_id: adminId,
      role: "admin",
      is_disabled: false,
      access_token: "admin-token",
    } as any);
    const selfDisable = await disableUser({ user_id: adminId, access_token: "admin-token" });

    expect(invalid.status).toBe(HttpStatusCode.HTTP_STATUS_BAD_REQUEST);
    expect(selfDisable.status).toBe(HttpStatusCode.HTTP_STATUS_BAD_REQUEST);
    expect(accountModel.findByPk).toHaveBeenCalledTimes(1);
  });

  it("does not permit a disabled account to log in", async () => {
    accountModel.findOne.mockResolvedValue({
      is_disabled: true,
      password_hashed: "password-hash",
    } as any);

    const result = await loginUser({ username: "member", password: "secret" });

    expect(result.status).toBe(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED);
    expect(mockCompare).not.toHaveBeenCalled();
  });
});