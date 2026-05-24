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
  const data = await apiRequest("/api/users/auth/login", {
    method: "POST",
    body: { username, password },
  });

  const authPayload = unwrapAuthPayload(data);

  if (!authPayload.access_token) {
    throw new Error(
      authPayload.message ||
        "Login succeeded but no access token was returned by the backend.",
    );
  }

  return authPayload;
};

export const saveAuthSession = (session) => {
  const authSession = {
    accessToken: session.access_token || session.accessToken,
    refreshToken: session.refresh_token || session.refreshToken,
    user: {
      id: session.user_id || session.userId,
      username: session.username,
      role: session.role,
    },
    authenticatedAt: new Date().toISOString(),
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authSession));
  return authSession;
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
