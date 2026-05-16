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

const withListMeta = (payload, keys) => ({
  items: readList(payload, keys),
  total: payload?.total || payload?.data?.total || 0,
  page: payload?.page || payload?.data?.page || 1,
  limit: payload?.limit || payload?.data?.limit || 10,
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

export const getRiskById = async (riskId) => {
  const payload = await apiRequest(
    `/api/users/integration/${riskId}`,
    {
      requiresAuth: false,
    }
  );

  return payload?.data || payload;
};

  return withListMeta(payload, ["integrations"]);
};

  return {
    items: payload?.integrations || [],
    total: payload?.total || 0,
    page: payload?.page || 1,
    limit: payload?.limit || 10,
  };
};
export const getRiskById = async (riskId) => {
  const payload = await apiRequest(`/api/users/risks/${riskId}`, {
    requiresAuth: false,
  });

  return payload?.data || payload;
};

export const getLinkedEventTypes = async () => {
  const payload = await apiRequest("/api/users/meta/linked-event-types", {
    requiresAuth: false,
  });

  return readList(payload, ["linkedEventTypes", "items"]);
};

export const getEventStatuses = async () => {
  const payload = await apiRequest("/api/users/meta/event-statuses", {
    requiresAuth: false,
  });

  return readList(payload, ["eventStatuses", "items"]);
};
