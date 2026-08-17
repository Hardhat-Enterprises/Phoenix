export const AUTH_STORAGE_KEY = "phoenixAuth";

export const API_GATEWAY_URL =
  import.meta.env.VITE_API_GATEWAY_URL?.replace(/\/$/, "") || "";

const buildApiUrl = (path) => `${API_GATEWAY_URL}${path}`;

const readJson = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export const getAuthSession = () => {
  const storedSession = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedSession) {
    return null;
  }

  try {
    return JSON.parse(storedSession);
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const getAccessToken = () => getAuthSession()?.accessToken || "";

const getApiErrorMessage = (data, response) =>
  data.message ||
  `Backend request failed (${response.status} ${response.statusText}). Confirm the Phoenix API gateway is running on localhost:3001.`;

const unwrapAuthPayload = (payload) => {
  if (Array.isArray(payload?.data)) {
    return {
      ...payload,
      ...payload.data[0],
    };
  }

  if (payload?.data && typeof payload.data === "object") {
    return {
      ...payload,
      ...payload.data,
    };
  }

  return payload;
};

export const apiRequest = async (
  path,
  { method = "GET", body, headers = {}, requiresAuth = false, signal } = {},
) => {
  const requestHeaders = {
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const accessToken = getAccessToken();

  if (requiresAuth && !accessToken) {
    throw new Error("Please sign in before loading backend data.");
  }

  if (requiresAuth && accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  let response;

  try {
    response = await fetch(buildApiUrl(path), {
      method,
      headers: requestHeaders,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    throw new Error(
      "Could not reach the Phoenix API gateway. Check that Docker is running and the gateway is available on localhost:3001.",
    );
  }

  const data = await readJson(response);

  if (!response.ok) {
    if (
      response.status === 401 &&
      ["Invalid token", "Logged out"].includes(data.message)
    ) {
      clearAuthSession();
    }

    const error = new Error(getApiErrorMessage(data, response));
    error.status = response.status;
    error.data = data;
    error.path = path;
    throw error;
  }

  if (data.status >= 400) {
    const error = new Error(getApiErrorMessage(data, response));
    error.status = data.status;
    error.data = data;
    error.path = path;
    throw error;
  }

  return data;
};

export const loginUser = async ({ username, password }) => {
  const identifier = username.trim();
  const data = await apiRequest("/api/users/auth/login", {
    method: "POST",
    body: identifier.includes("@")
      ? { email: identifier, password }
      : { username: identifier, password },
  });

  const authPayload = unwrapAuthPayload(data);
  const accessToken =
    authPayload.access_token || authPayload.accessToken || authPayload.token;

  if (!accessToken) {
    throw new Error(
      authPayload.message ||
        "Login succeeded but no access token was returned by the backend.",
    );
  }

  return { ...authPayload, access_token: accessToken };
};

export const saveAuthSession = (session) => {
  const user = session.user || {};
  const authSession = {
    accessToken: session.access_token || session.accessToken,
    refreshToken: session.refresh_token || session.refreshToken,
    user: {
      id: session.user_id || session.userId || user.user_id || user.id,
      username: session.username || user.username || user.email,
      email: session.email || user.email,
      role: session.role || user.role || "user",
    },
    authenticatedAt: new Date().toISOString(),
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authSession));
  return authSession;
};

export const registerUser = async ({ username, email, password, role }) => {
  const response = await apiRequest("/api/users/auth/register", {
    method: "POST",
    body: { username, email, password, role },
    requiresAuth: true,
  });
  const payload = unwrapAuthPayload(response);

  return {
    message: response.message || "User registered successfully",
    user: {
      id: payload.user_id || payload.userId,
      username: payload.username || username,
      email: payload.email || email,
      role: payload.role || role,
      createdAt: payload.created_at || payload.createdAt,
    },
  };
};

// --- Password recovery ------------------------------------------------------
//
// Week 5 task (Varun): convert the Forgot Password page into a real, validated
// workflow. Two safety requirements from the sprint brief drive this function:
//   1. Never reveal whether an account exists for a given username/email —
//      the success message is identical either way.
//   2. If the backend doesn't expose this endpoint yet, say so plainly rather
//      than pretending the reset succeeded.
export const requestPasswordReset = async (identifier) => {
  const trimmed = identifier.trim();

  try {
    await apiRequest("/api/users/auth/forgot-password", {
      method: "POST",
      body: trimmed.includes("@")
        ? { email: trimmed }
        : { username: trimmed },
    });
  } catch (error) {
    // 404 (route doesn't exist) or a network failure both mean the backend
    // doesn't support this yet — tell the user plainly instead of a generic error.
    if (
      error.status === 404 ||
      error.message?.includes("Could not reach the Phoenix API gateway")
    ) {
      const unavailable = new Error(
        "Password recovery isn't available from the backend yet. Please contact an administrator for help resetting your password.",
      );
      unavailable.code = "PASSWORD_RESET_UNAVAILABLE";
      throw unavailable;
    }

    // Any other failure: never surface backend internals, and never let the
    // error message hint at whether the account existed.
    const generic = new Error(
      "Something went wrong sending the reset link. Please try again shortly.",
    );
    generic.code = "PASSWORD_RESET_FAILED";
    throw generic;
  }

  // Always return an identical message on success, regardless of whether an
  // account actually matched — this is what prevents account enumeration.
  return {
    message:
      "If an account exists for that username or email, a reset link has been sent.",
  };
};

export const logoutUser = async () => {
  const userId = getAuthSession()?.user?.id;

  if (!userId) {
    clearAuthSession();
    return;
  }

  try {
    await apiRequest(`/api/users/auth/logout/${userId}`, {
      method: "POST",
      requiresAuth: true,
    });
  } finally {
    clearAuthSession();
  }
};

// --- Error message safety ---------------------------------------------------
//
// "Error messages must not expose backend internals" (Week 5 auth requirement).
// Expected auth failures (bad credentials, duplicate username, etc.) come back
// as 4xx with a deliberately user-facing message — safe to show as-is. Anything
// else (5xx, malformed responses, unexpected shapes) could leak stack traces or
// internal details, so those get replaced with a generic message instead.
const EXPECTED_AUTH_STATUS_CODES = [400, 401, 403, 404, 409, 422];

export const getSafeAuthErrorMessage = (error, fallback) => {
  if (!error) {
    return fallback;
  }

  // Network/gateway failures already carry a friendly message from apiRequest.
  if (error.message?.includes("Could not reach the Phoenix API gateway")) {
    return error.message;
  }

  if (EXPECTED_AUTH_STATUS_CODES.includes(error.status)) {
    return error.message || fallback;
  }

  return fallback;
};
