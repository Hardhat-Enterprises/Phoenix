const cleanEnvironmentUrl = (value) => value?.trim() || "";

export const API_GATEWAY_URL = cleanEnvironmentUrl(
  import.meta.env.VITE_API_GATEWAY_URL,
);

export const NOTIFICATION_API_URL = cleanEnvironmentUrl(
  import.meta.env.VITE_NOTIFICATION_API_URL,
);

// Optional service-specific addresses.
// If one is not supplied, the service is checked through the API gateway.
export const USER_API_URL =
  cleanEnvironmentUrl(import.meta.env.VITE_USER_API_URL) || API_GATEWAY_URL;

export const INGESTION_API_URL =
  cleanEnvironmentUrl(import.meta.env.VITE_INGESTION_API_URL) ||
  API_GATEWAY_URL;

export const NOTIFICATION_HEALTH_API_URL =
  NOTIFICATION_API_URL || API_GATEWAY_URL;

export const STORAGE_API_URL =
  cleanEnvironmentUrl(import.meta.env.VITE_STORAGE_API_URL) ||
  API_GATEWAY_URL;

// --- Sprint 2: Risk and Anomaly Feature Control (Varun) --------------------
//
// The supplied backend does not currently provide the risk-assessment or
// anomaly endpoints, so both features default to their safe state: Risk
// Assessment defaults to demo mode (true), and Anomaly Detection defaults to
// disabled (false). Either can be overridden per-environment via .env
// without touching component code, once the corresponding backend endpoint
// is actually available.

// Defaults to true (demo mode) unless explicitly set to "false".
export const RISK_ASSESSMENT_DEMO_MODE =
  (import.meta.env.VITE_RISK_ASSESSMENT_DEMO_MODE?.trim() || "true") !==
  "false";

// Defaults to false (disabled/hidden) unless explicitly set to "true".
export const ANOMALY_DETECTION_ENABLED =
  import.meta.env.VITE_ANOMALY_DETECTION_ENABLED?.trim() === "true";

export const buildApiUrl = (baseUrl, path = "") => {
  if (!baseUrl) {
    return path;
  }

  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");

  return cleanPath ? `${cleanBase}/${cleanPath}` : cleanBase;
};
