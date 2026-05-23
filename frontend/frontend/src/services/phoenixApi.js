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
    requiresAuth: false,
  });

  return withListMeta(payload, ["threats"]);
};

export const getHazards = async (params = {}) => {
  const payload = await apiRequest(`/api/users/hazards${toQueryString(params)}`, {
    requiresAuth: false,
  });

  return withListMeta(payload, ["hazards"]);
};

export const getRisks = async (params = {}) => {
  try {
    const payload = await apiRequest(`/api/users/risks${toQueryString(params)}`, {
      requiresAuth: false,
    });

    return withListMeta(payload, [
      "risks",
      "riskAssessments",
      "risk_assessments",
      "items",
      "data",
    ]);
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }

    const payload = await apiRequest(
      `/api/users/risk-assessments${toQueryString(params)}`,
      {
        requiresAuth: false,
      },
    );

    return withListMeta(payload, [
      "data",
      "riskAssessments",
      "risk_assessments",
      "risks",
      "items",
    ]);
  }
};

export const getIntegrations = async (params = {}) => {
  const payload = await apiRequest(
    `/api/users/integration${toQueryString(params)}`,
    {
      requiresAuth: false,
    },
  );

  return withListMeta(payload, ["integrations", "items", "data"]);
};


export const getLinkedEventTypes = async () => {
  const payload = await apiRequest("/api/users/meta/linked-event-types", {
    requiresAuth: false,
  });

  return readList(payload, ["linked_event_types", "linkedEventTypes", "items"]);
};

export const getEventStatuses = async () => {
  const payload = await apiRequest("/api/users/meta/event-statuses", {
    requiresAuth: false,
  });

  return readList(payload, ["event_statuses", "eventStatuses", "items"]);
};

export const postIngestionStream = async (payload) => {
  const response = await apiRequest("/api/ingestion/stream", {
    method: "POST",
    body: payload,
  });

  return response;
};

export const postIngestionCore = async (payload) => {
  const response = await apiRequest("/api/ingestion/core", {
    method: "POST",
    body: payload,
  });

  return response;
};

export const getIngestionHealth = async () => {
  const payload = await apiRequest("/api/ingestion/health");

  return payload;
};

export const getStorageHealth = async () => {
  const payload = await apiRequest("/api/storage/health");

  return payload;
};