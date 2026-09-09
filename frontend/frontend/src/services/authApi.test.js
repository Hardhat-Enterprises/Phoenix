import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("../config/environment", () => ({
  API_GATEWAY_URL: "http://localhost:3001",
  buildApiUrl: (base, path = "") =>
    `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`,
}));

vi.mock("../config/roles", () => ({
  DEFAULT_USER_ROLE: "user",
}));

const loadAuthApi = async () => {
  vi.resetModules();
  return import("./authApi");
};

describe("PHOENIX authentication", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("logs in and stores the returned session", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 200,
            access_token: "access-token",
            refresh_token: "refresh-token",
            user_id: 7,
            username: "aayan",
            role: "admin",
          }),
          { status: 200 },
        ),
      );

    const {
      loginUser,
      saveAuthSession,
      getAuthSession,
    } = await loadAuthApi();

    const response = await loginUser({
      username: "aayan",
      password: "password",
    });

    saveAuthSession(response);

    const session = getAuthSession();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.access_token).toBe("access-token");
    expect(session.accessToken).toBe("access-token");
    expect(session.refreshToken).toBe("refresh-token");
    expect(session.user.username).toBe("aayan");
  });

  it("refreshes an expired access token and retries once", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "Invalid token",
          }),
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 200,
            access_token: "new-access-token",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 200,
            data: [
              {
                id: 1,
                name: "Recovered",
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const {
      saveAuthSession,
      apiRequest,
      getAuthSession,
    } = await loadAuthApi();

    saveAuthSession({
      access_token: "expired-access-token",
      refresh_token: "refresh-token",
      user_id: 7,
      username: "aayan",
      role: "admin",
    });

    const result = await apiRequest(
      "/api/protected",
      {
        requiresAuth: true,
      },
    );

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(getAuthSession().accessToken).toBe(
      "new-access-token",
    );
  });

  it("clears the session when refresh fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "Invalid token",
          }),
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 401,
            message: "Refresh token expired",
          }),
          { status: 401 },
        ),
      );

    const {
      saveAuthSession,
      apiRequest,
      getAuthSession,
    } = await loadAuthApi();

    saveAuthSession({
      access_token: "expired-access-token",
      refresh_token: "expired-refresh-token",
      user_id: 7,
      username: "aayan",
      role: "admin",
    });

    await expect(
      apiRequest("/api/protected", {
        requiresAuth: true,
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: "AUTH_SESSION_EXPIRED",
    });

    expect(getAuthSession()).toBeNull();
  });

  it("does not enter a retry loop", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "Invalid token",
          }),
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 401,
            message: "Refresh failed",
          }),
          { status: 401 },
        ),
      );

    const {
      saveAuthSession,
      apiRequest,
    } = await loadAuthApi();

    saveAuthSession({
      access_token: "expired-access-token",
      refresh_token: "expired-refresh-token",
      user_id: 7,
      username: "aayan",
      role: "admin",
    });

    await expect(
      apiRequest("/api/protected", {
        requiresAuth: true,
      }),
    ).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears the session during logout", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 200,
        }),
        { status: 200 },
      ),
    );

    const {
      saveAuthSession,
      logoutUser,
      getAuthSession,
    } = await loadAuthApi();

    saveAuthSession({
      access_token: "access-token",
      refresh_token: "refresh-token",
      user_id: 7,
      username: "aayan",
      role: "admin",
    });

    await logoutUser();

    expect(getAuthSession()).toBeNull();
  });
});