import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Kept in its own file rather than added to authApi.test.js, so this change
// does not collide with the auth tests already in flight.

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

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: "",
  text: async () => JSON.stringify(body),
});

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("PASSWORD_RESET_SUPPORTED", () => {
  it("is false while the gateway exposes no reset endpoint", async () => {
    const { PASSWORD_RESET_SUPPORTED } = await loadAuthApi();

    // Guards the UI from offering recovery that cannot work. Flip it when the
    // backend adds the endpoint.
    expect(PASSWORD_RESET_SUPPORTED).toBe(false);
  });
});

describe("requestPasswordReset", () => {
  it("posts the email to the recovery endpoint", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ message: "sent" }));

    const { requestPasswordReset } = await loadAuthApi();
    await requestPasswordReset("user@example.com");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toBe("http://localhost:3001/api/users/auth/forgot-password");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ email: "user@example.com" });
  });

  it("trims the address before sending it", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({}));

    const { requestPasswordReset } = await loadAuthApi();
    await requestPasswordReset("  user@example.com  ");

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: "user@example.com",
    });
  });

  it("sends an empty address rather than the string \"undefined\"", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({}));

    const { requestPasswordReset } = await loadAuthApi();
    await requestPasswordReset(undefined);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: "" });
  });

  it("does not attach a bearer token: recovery is for users who cannot sign in", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({}));

    localStorage.setItem(
      "phoenixAuth",
      JSON.stringify({ accessToken: "should-not-be-sent" }),
    );

    const { requestPasswordReset } = await loadAuthApi();
    await requestPasswordReset("user@example.com");

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it("surfaces rate limiting with its status, so the page can report it", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ message: "Too many requests" }, 429),
    );

    const { requestPasswordReset } = await loadAuthApi();

    await expect(requestPasswordReset("user@example.com")).rejects.toMatchObject({
      status: 429,
    });
  });

  it("surfaces a missing endpoint as a 404 rather than resolving", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ message: "Cannot POST" }, 404),
    );

    const { requestPasswordReset } = await loadAuthApi();

    await expect(requestPasswordReset("user@example.com")).rejects.toMatchObject({
      status: 404,
    });
  });
});
