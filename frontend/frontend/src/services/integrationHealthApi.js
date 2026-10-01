import {
  API_GATEWAY_URL,
  USER_API_URL,
  INGESTION_API_URL,
  NOTIFICATION_HEALTH_API_URL,
  STORAGE_API_URL,
  buildApiUrl,
} from "../config/environment";
import { getAccessToken } from "./authApi";

export const HEALTH_CHECK_TIMEOUT_MS = 5000;
export const HEALTH_POLL_INTERVAL_MS = 30000;

export const INTEGRATION_SERVICES = Object.freeze([
  {
    id: "gateway",
    name: "API Gateway",
    baseUrl: API_GATEWAY_URL,
    path: "/health",
    usesGateway: true,
  },
  {
    id: "users",
    name: "User service",
    baseUrl: USER_API_URL,
    path: "/api/users/health",
    usesGateway: USER_API_URL === API_GATEWAY_URL,
  },
  {
    id: "ingestion",
    name: "Ingestion service",
    baseUrl: INGESTION_API_URL,
    path: "/api/ingestion/health",
    usesGateway: INGESTION_API_URL === API_GATEWAY_URL,
  },
  {
    id: "notifications",
    name: "Notification service",
    baseUrl: NOTIFICATION_HEALTH_API_URL,
    path: "/api/notifications/health",
    usesGateway: NOTIFICATION_HEALTH_API_URL === API_GATEWAY_URL,
  },
  {
    id: "storage",
    name: "Storage service",
    baseUrl: STORAGE_API_URL,
    path: "/api/storage/health",
    usesGateway: STORAGE_API_URL === API_GATEWAY_URL,
  },
]);

const isValidServiceAddress = (baseUrl) => {
  if (!baseUrl) {
    return false;
  }

  // Relative same-origin configuration is allowed.
  if (baseUrl.startsWith("/")) {
    return true;
  }

  try {
    const parsedUrl = new URL(baseUrl);
    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

const getReportedHealth = (payload) => {
  const reportedStatus =
    payload?.status ?? payload?.health ?? payload?.state ?? "";

  return String(reportedStatus).trim().toLowerCase();
};

export const classifyHealthResponse = (response, payload = {}) => {
  const reportedHealth = getReportedHealth(payload);

  if (
    ["degraded", "warning", "warn", "partial"].includes(reportedHealth)
  ) {
    return {
      status: "degraded",
      failureType: "backend",
      lastError: "The service reported degraded health.",
    };
  }

  if (
    ["unhealthy", "down", "unavailable", "failed", "failure", "error"].includes(
      reportedHealth,
    )
  ) {
    return {
      status: "unavailable",
      failureType: "backend",
      lastError: "The service reported that it is unavailable.",
    };
  }

  if (response.ok) {
    return {
      status: "available",
      failureType: null,
      lastError: null,
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      status: "degraded",
      failureType: "authentication",
      lastError: `Authentication failed for the health check (${response.status}).`,
    };
  }

  if (response.status === 404) {
    return {
      status: "degraded",
      failureType: "configuration",
      lastError:
        "The health endpoint was not found. Check the frontend service configuration.",
    };
  }

  if (response.status === 408 || response.status === 504) {
    return {
      status: "unavailable",
      failureType: "timeout",
      lastError: `The health check timed out (${response.status}).`,
    };
  }

  if (response.status >= 500) {
    return {
      status: "unavailable",
      failureType: "backend",
      lastError: `The backend health check failed (${response.status}).`,
    };
  }

  return {
    status: "degraded",
    failureType: "backend",
    lastError: `The health check returned HTTP ${response.status}.`,
  };
};

const readHealthPayload = async (response) => {
  try {
    const text = await response.text();

    if (!text) {
      return {};
    }

    return JSON.parse(text);
  } catch {
    // Health response content is intentionally not exposed to the UI.
    return {};
  }
};

const createFailureResult = (
  service,
  {
    status = "unavailable",
    failureType,
    lastError,
    responseTimeMs = null,
  },
) => ({
  id: service.id,
  name: service.name,
  status,
  responseTimeMs,
  failureType,
  lastError,
  lastChecked: new Date().toISOString(),
});

export const checkServiceHealth = async (
  service,
  {
    signal,
    timeoutMs = HEALTH_CHECK_TIMEOUT_MS,
  } = {},
) => {
  if (!isValidServiceAddress(service.baseUrl)) {
    return createFailureResult(service, {
      failureType: "configuration",
      lastError:
        "The service address is missing or incorrectly configured in the frontend environment.",
    });
  }

  const requestController = new AbortController();
  let timedOut = false;

  const cancelFromParent = () => requestController.abort();

  if (signal?.aborted) {
    requestController.abort();
  } else {
    signal?.addEventListener("abort", cancelFromParent, { once: true });
  }

  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    requestController.abort();
  }, timeoutMs);

  const startedAt = performance.now();

  try {
    const accessToken = getAccessToken();

    const headers = {};

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(
      buildApiUrl(service.baseUrl, service.path),
      {
        method: "GET",
        headers,
        credentials: "include",
        cache: "no-store",
        signal: requestController.signal,
      },
    );

    const responseTimeMs = Math.round(performance.now() - startedAt);
    const payload = await readHealthPayload(response);
    const classification = classifyHealthResponse(response, payload);

    return {
      id: service.id,
      name: service.name,
      responseTimeMs,
      lastChecked: new Date().toISOString(),
      ...classification,
    };
  } catch (error) {
    const responseTimeMs = Math.round(performance.now() - startedAt);

    // Leaving the page or hiding the browser tab intentionally cancels checks.
    if (signal?.aborted) {
      throw error;
    }

    if (timedOut || error?.name === "AbortError") {
      return createFailureResult(service, {
        failureType: "timeout",
        lastError: `The health check did not respond within ${timeoutMs} ms.`,
        responseTimeMs,
      });
    }

    return createFailureResult(service, {
      failureType: service.usesGateway
        ? "unreachable_gateway"
        : "unreachable_service",
      lastError: service.usesGateway
        ? "The API gateway could not be reached."
        : "The service could not be reached.",
      responseTimeMs,
    });
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", cancelFromParent);
  }
};

export const checkAllIntegrationServices = async ({ signal } = {}) =>
  Promise.all(
    INTEGRATION_SERVICES.map((service) =>
      checkServiceHealth(service, { signal }),
    ),
  );