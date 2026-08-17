export const API_GATEWAY_URL =
  import.meta.env.VITE_API_GATEWAY_URL?.trim() || "";

export const NOTIFICATION_API_URL =
  import.meta.env.VITE_NOTIFICATION_API_URL?.trim() || "";

export const buildApiUrl = (baseUrl, path = "") => {
  if (!baseUrl) {
    return path;
  }

  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");

  return cleanPath ? `${cleanBase}/${cleanPath}` : cleanBase;
};