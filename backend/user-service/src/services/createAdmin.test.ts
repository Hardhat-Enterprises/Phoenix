import { UserAccount, UserRole } from "@phoenix/common";
import { createAdmin } from "./user.service";

jest.mock("@phoenix/common", () => ({
  UserAccount: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  UserRole: {
    ADMIN: "admin",
  },
  HttpStatusCode: {
    HTTP_STATUS_OK: 200,
    HTTP_STATUS_CREATED: 201,
    HTTP_STATUS_BAD_REQUEST: 400,
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
  },
  EventStatus: {
    findAll: jest.fn(),
  },
  createCacheKey: (service: string, resource: string, identifier: string) =>
    `phoenix:test:${service}:${resource}:${identifier}`,
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password-value"),
}));

const mockedUserAccount = UserAccount as jest.Mocked<typeof UserAccount>;

describe("createAdmin", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("rejects when username is missing", async () => {
    const result = await createAdmin({ username: "", password: "pass123" } as any);
    expect(result.status).toBe(400);
    expect(mockedUserAccount.create).not.toHaveBeenCalled();
  });

  it("rejects when password is missing", async () => {
    const result = await createAdmin({ username: "newadmin", password: "" } as any);
    expect(result.status).toBe(400);
    expect(mockedUserAccount.create).not.toHaveBeenCalled();
  });

  it("rejects when username already exists", async () => {
    mockedUserAccount.findOne.mockResolvedValue({ username: "existingadmin" } as any);

    const result = await createAdmin({
      username: "existingadmin",
      password: "pass123",
    });

    expect(result.status).toBe(400);
    expect(result.message).toBe("Username already exists");
    expect(mockedUserAccount.create).not.toHaveBeenCalled();
  });

  it("creates a new admin with a hashed password and role hardcoded to admin", async () => {
    mockedUserAccount.findOne.mockResolvedValue(null);
    mockedUserAccount.create.mockResolvedValue({
      user_id: "new-admin-id",
      username: "newadmin",
      role: UserRole.ADMIN,
    } as any);

    const result = await createAdmin({
      username: "newadmin",
      password: "pass123",
    });

    expect(result.status).toBe(201);
    expect(result.role).toBe("admin");
    expect(mockedUserAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "newadmin",
        password_hashed: "hashed-password-value",
        role: UserRole.ADMIN,
      }),
    );
  });

  it("never allows a client-supplied role to override the hardcoded admin role", async () => {
    mockedUserAccount.findOne.mockResolvedValue(null);
    mockedUserAccount.create.mockResolvedValue({
      user_id: "new-admin-id",
      username: "sneaky",
      role: UserRole.ADMIN,
    } as any);

    // Even if something upstream tried to sneak a role field in,
    // the DTO type has no `role` property, so it can't reach this
    // function's logic at all. This test documents that guarantee.
    const result = await createAdmin({
      username: "sneaky",
      password: "pass123",
      // @ts-expect-error - role is deliberately not part of CreateAdminDto
      role: "end_user",
    });

    expect(mockedUserAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.ADMIN }),
    );
    expect(result.role).toBe("admin");
  });
});