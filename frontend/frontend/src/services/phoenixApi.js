import { apiRequest } from "./authApi";

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

const unwrapData = (payload) => {
  if (Array.isArray(payload?.data)) {
    return payload.data[0] || {};
  }

  if (payload?.data && typeof payload.data === "object") {
    return payload.data;
  }

  return payload || {};
};

const readList = (payload, keys) => {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }

    if (Array.isArray(payload?.data?.[key])) {
      return payload.data[key];
    }

    if (Array.isArray(payload?.data) && Array.isArray(payload.data[0]?.[key])) {
      return payload.data[0][key];
    }
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

const withListMeta = (payload, keys) => {
  const items = readList(payload, keys);

  return {
    items,
    total: payload?.total ?? payload?.data?.total ?? items.length,
    page: payload?.page ?? payload?.data?.page ?? 1,
    limit: payload?.limit ?? payload?.data?.limit ?? 10,
  };
};

const parseJsonField = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeIntegration = (integration) => ({
  ...integration,
  input: parseJsonField(integration.input),
  output: parseJsonField(integration.output),
});

const invalidDetailResponse = () => {
  const error = new Error("The requested record is unavailable or malformed.");
  error.code = "INVALID_DETAIL_RESPONSE";
  return error;
};

const validateDetailId = (id) => {
  if (typeof id !== "string" || !id.trim()) {
    throw invalidDetailResponse();
  }
};

const readDetailRecord = (record, id, idKey) => {
  if (record === undefined || record === null) return null;

  if (
    typeof record !== "object" ||
    Array.isArray(record) ||
    typeof record[idKey] !== "string" ||
    record[idKey].toLowerCase() !== id.toLowerCase()
  ) {
    throw invalidDetailResponse();
  }

  return record;
};

export const getDashboardOverview = async () => {
  const payload = await apiRequest("/api/users/dashboard/overview", {
    requiresAuth: true,
  });

  return unwrapData(payload);
};

export const getDashboardCharts = async () => {
  const payload = await apiRequest("/api/users/dashboard/charts", {
    requiresAuth: true,
  });

  return unwrapData(payload);
};

export const getDashboardActivity = async () => {
  const payload = await apiRequest("/api/users/dashboard/activity", {
    requiresAuth: true,
  });

  // Return the activity list, not just first item
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  return unwrapData(payload);
};

// The gateway exposes GET /api/notifications only. While this is false the
// notification provider substitutes a local no-op for every mutation and the
// panel words its confirmations accordingly, so nothing claims to have been
// saved. See src/services/notificationApiProvider.js.
export const NOTIFICATION_MUTATIONS_SUPPORTED = false;

// Sending an alert needs a backend send endpoint. None exists yet, so no part
// of the UI may offer to forward or deliver a notification.
export const NOTIFICATION_SEND_SUPPORTED = false;

const toNotificationQueryString = (params = {}, searchOption = {}) => {
  const query = new URLSearchParams();

  for (const key of ["page", "limit", "read"]) {
    const value = params[key];

    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  }

  const searchParameter = searchOption.parameterName?.trim();

  if (
    searchOption.enabled === true &&
    searchParameter &&
    params.search !== undefined &&
    params.search !== null &&
    params.search !== ""
  ) {
    query.set(searchParameter, params.search);
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

const normalizeNotificationList = (payload) => {
  const notifications = payload?.data?.notifications;
  const pagination = payload?.data?.pagination;
  const hasValidPagination =
    pagination &&
    ["total", "page", "limit", "totalPages"].every((key) =>
      Number.isFinite(pagination[key]),
    );

  if (!Array.isArray(notifications) || !hasValidPagination) {
    throw new Error("Notification list response is malformed.");
  }

  const normalizedPagination = {
    total: pagination.total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: pagination.totalPages,
  };

  return {
    notifications,
    pagination: normalizedPagination,
    // Compatibility fields used by the current notifier.
    items: notifications,
    total: normalizedPagination.total,
    totalPages: normalizedPagination.totalPages,
  };
};

const notificationRequest = (path, options = {}) =>
  apiRequest(path, {
    ...options,
    requiresAuth: true,
  });

export const getNotificationHealth = async ({ signal } = {}) =>
  apiRequest("/api/notifications/health", {
    requiresAuth: false,
    signal,
  });

export const getNotifications = async (
  params = {},
  {
    signal,
    search: searchOption = { enabled: false, parameterName: null },
  } = {},
) => {
  const payload = await notificationRequest(
    `/api/notifications${toNotificationQueryString(params, searchOption)}`,
    { signal },
  );

  return normalizeNotificationList(payload);
};

export const getNotificationUnreadCount = async ({ signal } = {}) => {
  const payload = await notificationRequest(
    "/api/notifications/unread-count",
    { signal },
  );

  return payload?.data?.unreadCount;
};

export const markNotificationRead = async (notificationId, { signal } = {}) =>
  notificationRequest(
    `/api/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "PATCH", signal },
  );

export const markAllNotificationsRead = async ({ signal } = {}) =>
  notificationRequest("/api/notifications/read-all", {
    method: "PATCH",
    signal,
  });

export const deleteNotification = async (notificationId, { signal } = {}) =>
  notificationRequest(
    `/api/notifications/${encodeURIComponent(notificationId)}`,
    {
      method: "DELETE",
      signal,
    },
  );

export const getApiHealth = async () => {
  return apiRequest("/api/users/health", {
    requiresAuth: false,
  });
};

export const getIngestionHealth = async () => {
  const payload = await apiRequest("/api/ingestion/health");

  return payload;
};

export const getThreats = async (params = {}) => {
  const payload = await apiRequest(`/api/users/threats${toQueryString(params)}`, {
    requiresAuth: true,
  });

  return withListMeta(payload, ["threats"]);
};

export const getThreat = async (threatId, { signal } = {}) => {
  validateDetailId(threatId);

  const payload = await apiRequest(
    `/api/users/threats/${encodeURIComponent(threatId)}`,
    {
      requiresAuth: true,
      signal,
    },
  );

  return readDetailRecord(payload?.threat, threatId, "threat_id");
};

export const getThreatById = getThreat;

export const getHazards = async (params = {}) => {
  const payload = await apiRequest(`/api/users/hazards${toQueryString(params)}`, {
    requiresAuth: true,
  });

  return withListMeta(payload, ["hazards"]);
};

// Fetch a single hazard by id.
// Path assumed to follow the list route — confirm with the backend team.
export const getHazardById = async (hazardId) => {
  const payload = await apiRequest(
    `/api/users/hazards/${encodeURIComponent(hazardId)}`,
    {
      requiresAuth: true,
    },
  );

  return unwrapData(payload);
};

export const getLocations = async () => {
  const payload = await apiRequest("/api/users/meta/locations", {
    requiresAuth: true,
  });

  return readList(payload, ["locations", "items", "data"]);
};

export const getRisks = async (params = {}) => {
  try {
    const payload = await apiRequest(
      `/api/users/risk-assessments${toQueryString(params)}`,
      {
        requiresAuth: true,
      },
    );

    return withListMeta(payload, [
      "riskAssessments",
      "risk_assessments",
      "risks",
      "items",
      "data",
    ]);
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }

    const payload = await apiRequest(
      `/api/users/integration${toQueryString(params)}`,
      {
        requiresAuth: true,
      },
    );

    return withListMeta(payload, [
      "integrations",
      "items",
      "data",
    ]);
  }
};

export const getIntegrations = async (params = {}) => {
  const payload = await apiRequest(
    `/api/users/integration${toQueryString(params)}`,
    {
      requiresAuth: true,
    },
  );

  const meta = withListMeta(payload, ["integrations", "items", "data"]);

  return {
    ...meta,
    items: meta.items.map(normalizeIntegration),
  };
};

export const getIntegrationById = async (integrationId, { signal } = {}) => {
  validateDetailId(integrationId);

  const payload = await apiRequest(
    `/api/users/integration/${encodeURIComponent(integrationId)}`,
    {
      requiresAuth: true,
      signal,
    },
  );

  const integration = readDetailRecord(
    payload?.integration,
    integrationId,
    "integration_event_id",
  );

  return integration ? normalizeIntegration(integration) : null;
};


export const getLinkedEventTypes = async () => {
  const payload = await apiRequest("/api/users/meta/linked-event-types", {
    requiresAuth: true,
  });

  return readList(payload, ["linked_event_types", "linkedEventTypes", "items"]);
};

export const getEventStatuses = async () => {
  const payload = await apiRequest("/api/users/meta/event-statuses", {
    requiresAuth: true,
  });

  return readList(payload, ["event_statuses", "eventStatuses", "items"]);
};

export const postIngestionCore = async (payload) => {
  const response = await apiRequest("/api/ingestion/core", {
    method: "POST",
    body: payload,
    requiresAuth: true,
  });

  return response;
};

export const postIngestionAnomaly = async (payload) => {
  try {
    return await apiRequest("/api/ingestion/anomaly", {
      method: "POST",
      body: payload,
      requiresAuth: true,
    });
  } catch (error) {
    if (
      error.status === 404 ||
      String(error.message || "").includes("Cannot POST /api/ingestion/anomaly")
    ) {
      error.code = "ANOMALY_ENDPOINT_UNAVAILABLE";
    }

    throw error;
  }
};
