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

export const buildApiUrl = (baseUrl, path = "") => {
  if (!baseUrl) {
    return path;
  }

  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");

  return cleanPath ? `${cleanBase}/${cleanPath}` : cleanBase;
};