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

  return unwrapData(payload);
};

export const getApiHealth = async () => {
  const payload = await apiRequest("/api/users/health");

  return payload;
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

export const getHazards = async (params = {}) => {
  const payload = await apiRequest(`/api/users/hazards${toQueryString(params)}`, {
    requiresAuth: true,
  });

  return withListMeta(payload, ["hazards"]);
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
