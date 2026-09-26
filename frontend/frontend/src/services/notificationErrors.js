// ---------------------------------------------------------------------------
// Notification error classification
//
// Normalises REST and WebSocket failures into safe, user-facing recovery
// information. This module does not perform REST actions or open WebSockets.
// ---------------------------------------------------------------------------

export const NOTIFICATION_ERROR_KINDS = Object.freeze({
  VALIDATION: "validation",
  MISSING_LOGIN: "missing-login",
  UNAUTHORISED: "unauthorised",
  FORBIDDEN: "forbidden",
  ENDPOINT_UNAVAILABLE: "endpoint-unavailable",
  NOT_FOUND: "not-found",
  RATE_LIMITED: "rate-limited",
  SERVER: "server",
  NETWORK: "network",
  MALFORMED_REST_RESPONSE: "malformed-rest-response",
  MALFORMED_WEBSOCKET_MESSAGE: "malformed-websocket-message",
  WEBSOCKET_AUTH_REJECTED: "websocket-auth-rejected",
  WEBSOCKET_AUTH_TIMEOUT: "websocket-auth-timeout",
  WEBSOCKET_CLOSED: "websocket-closed",
  UNSUPPORTED_WEBSOCKET_MESSAGE: "unsupported-websocket-message",
  UNKNOWN: "unknown",
});

export const NOTIFICATION_ERROR_CATEGORIES = Object.freeze({
  VALIDATION: "validation",
  AUTHENTICATION: "authentication",
  AUTHORISATION: "authorisation",
  NOT_FOUND: "not-found",
  RATE_LIMIT: "rate-limit",
  CONNECTION: "connection",
  RESPONSE: "response",
  SERVER: "server",
  UNKNOWN: "unknown",
});

export const NOTIFICATION_RECOVERY = Object.freeze({
  SIGN_IN: "sign-in",
  RETRY: "retry",
  NONE: "none",
});

const statusOf = (error) => {
  const status = Number(error?.status ?? error?.response?.status);

  return Number.isFinite(status) && status > 0 ? status : 0;
};

const codeOf = (error) =>
  String(error?.code ?? error?.type ?? "")
    .trim()
    .toUpperCase();

const messageOf = (error) =>
  String(error?.message ?? "").trim();

const lowerMessageOf = (error) =>
  messageOf(error).toLowerCase();

const looksLikeMissingLogin = (error) => {
  const text = lowerMessageOf(error);

  return (
    text.includes("please sign in") ||
    text.includes("not signed in") ||
    text.includes("missing login") ||
    text.includes("authentication required")
  );
};

const looksLikeNetwork = (error) => {
  const text = lowerMessageOf(error);

  return (
    text.includes("could not reach") ||
    text.includes("failed to fetch") ||
    text.includes("network") ||
    error?.name === "TypeError"
  );
};

const looksLikeMalformedRestResponse = (error) => {
  const text = lowerMessageOf(error);

  return (
    codeOf(error) === "MALFORMED_REST_RESPONSE" ||
    text.includes("notification list response is malformed")
  );
};

const looksLikeEndpointUnavailable = (error) => {
  const code = codeOf(error);

  return (
    code === "NOTIFICATION_ENDPOINT_UNAVAILABLE" ||
    code === "ENDPOINT_UNAVAILABLE"
  );
};

const kindOf = (error) => {
  const status = statusOf(error);
  const code = codeOf(error);

  if (
    code === "MISSING_LOGIN" ||
    code === "NOT_AUTHENTICATED" ||
    looksLikeMissingLogin(error)
  ) {
    return NOTIFICATION_ERROR_KINDS.MISSING_LOGIN;
  }

  if (
    code === "WS_AUTH_REJECTED" ||
    code === "WEBSOCKET_AUTH_REJECTED"
  ) {
    return NOTIFICATION_ERROR_KINDS.WEBSOCKET_AUTH_REJECTED;
  }

  if (
    code === "WS_AUTH_TIMEOUT" ||
    code === "WEBSOCKET_AUTH_TIMEOUT"
  ) {
    return NOTIFICATION_ERROR_KINDS.WEBSOCKET_AUTH_TIMEOUT;
  }

  if (
    code === "WS_MALFORMED_MESSAGE" ||
    code === "MALFORMED_WEBSOCKET_MESSAGE"
  ) {
    return NOTIFICATION_ERROR_KINDS.MALFORMED_WEBSOCKET_MESSAGE;
  }

  if (
    code === "WS_UNEXPECTED_CLOSE" ||
    code === "WEBSOCKET_CLOSED"
  ) {
    return NOTIFICATION_ERROR_KINDS.WEBSOCKET_CLOSED;
  }

  if (
    code === "WS_UNSUPPORTED_MESSAGE" ||
    code === "UNSUPPORTED_WEBSOCKET_MESSAGE"
  ) {
    return NOTIFICATION_ERROR_KINDS.UNSUPPORTED_WEBSOCKET_MESSAGE;
  }

  if (looksLikeMalformedRestResponse(error)) {
    return NOTIFICATION_ERROR_KINDS.MALFORMED_REST_RESPONSE;
  }

  if (looksLikeEndpointUnavailable(error)) {
    return NOTIFICATION_ERROR_KINDS.ENDPOINT_UNAVAILABLE;
  }

  if (status === 400 || status === 422) {
    return NOTIFICATION_ERROR_KINDS.VALIDATION;
  }

  if (status === 401) {
    return NOTIFICATION_ERROR_KINDS.UNAUTHORISED;
  }

  if (status === 403) {
    return NOTIFICATION_ERROR_KINDS.FORBIDDEN;
  }

  if (status === 404) {
    return NOTIFICATION_ERROR_KINDS.NOT_FOUND;
  }

  if (status === 429) {
    return NOTIFICATION_ERROR_KINDS.RATE_LIMITED;
  }

  if (status >= 500) {
    return NOTIFICATION_ERROR_KINDS.SERVER;
  }

  if (looksLikeNetwork(error)) {
    return NOTIFICATION_ERROR_KINDS.NETWORK;
  }

  return NOTIFICATION_ERROR_KINDS.UNKNOWN;
};

const descriptionFor = (kind) => {
  switch (kind) {
    case NOTIFICATION_ERROR_KINDS.VALIDATION:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.VALIDATION,
        title: "That request was rejected",
        message: "Check the notification request and try again.",
        recovery: NOTIFICATION_RECOVERY.RETRY,
      };

    case NOTIFICATION_ERROR_KINDS.MISSING_LOGIN:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.AUTHENTICATION,
        title: "Sign in required",
        message: "Sign in to access your notifications.",
        recovery: NOTIFICATION_RECOVERY.SIGN_IN,
      };

    case NOTIFICATION_ERROR_KINDS.UNAUTHORISED:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.AUTHENTICATION,
        title: "Your session has expired",
        message: "Your session has expired. Sign in again.",
        recovery: NOTIFICATION_RECOVERY.SIGN_IN,
      };

    case NOTIFICATION_ERROR_KINDS.FORBIDDEN:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.AUTHORISATION,
        title: "Notification access is not permitted",
        message:
          "Your account does not have permission to access these notifications.",
        recovery: NOTIFICATION_RECOVERY.NONE,
      };

    case NOTIFICATION_ERROR_KINDS.ENDPOINT_UNAVAILABLE:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.CONNECTION,
        title: "Notifications are temporarily unavailable",
        message:
          "The notification service is temporarily unavailable. Try again later.",
        recovery: NOTIFICATION_RECOVERY.RETRY,
      };

    case NOTIFICATION_ERROR_KINDS.NOT_FOUND:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.NOT_FOUND,
        title: "Notification not found",
        message: "That notification is no longer available.",
        recovery: NOTIFICATION_RECOVERY.NONE,
      };

    case NOTIFICATION_ERROR_KINDS.RATE_LIMITED:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.RATE_LIMIT,
        title: "Too many notification requests",
        message:
          "Too many requests were made. Wait a moment before trying again.",
        recovery: NOTIFICATION_RECOVERY.RETRY,
      };

    case NOTIFICATION_ERROR_KINDS.NETWORK:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.CONNECTION,
        title: "Notification connection lost",
        message:
          "The notification service could not be reached. Check your connection and try again.",
        recovery: NOTIFICATION_RECOVERY.RETRY,
      };

    case NOTIFICATION_ERROR_KINDS.MALFORMED_REST_RESPONSE:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.RESPONSE,
        title: "Notification response could not be read",
        message:
          "The notification service returned an unreadable response. Try again.",
        recovery: NOTIFICATION_RECOVERY.RETRY,
      };

    case NOTIFICATION_ERROR_KINDS.MALFORMED_WEBSOCKET_MESSAGE:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.RESPONSE,
        title: "A notification update could not be read",
        message:
          "An incoming notification update was unreadable. Reconnecting may resolve the problem.",
        recovery: NOTIFICATION_RECOVERY.RETRY,
      };

    case NOTIFICATION_ERROR_KINDS.WEBSOCKET_AUTH_REJECTED:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.AUTHENTICATION,
        title: "Notification connection requires sign in",
        message:
          "The notification connection could not authenticate your session. Sign in again.",
        recovery: NOTIFICATION_RECOVERY.SIGN_IN,
      };

    case NOTIFICATION_ERROR_KINDS.WEBSOCKET_AUTH_TIMEOUT:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.CONNECTION,
        title: "Notification authentication timed out",
        message:
          "The notification connection could not verify your session in time. You can retry the connection.",
        recovery: NOTIFICATION_RECOVERY.RETRY,
      };

    case NOTIFICATION_ERROR_KINDS.WEBSOCKET_CLOSED:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.CONNECTION,
        title: "Notification connection interrupted",
        message:
          "The live notification connection was interrupted. You can try reconnecting.",
        recovery: NOTIFICATION_RECOVERY.RETRY,
      };

    case NOTIFICATION_ERROR_KINDS.UNSUPPORTED_WEBSOCKET_MESSAGE:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.RESPONSE,
        title: "Notification update was not supported",
        message: "An unsupported notification update was ignored.",
        recovery: NOTIFICATION_RECOVERY.NONE,
      };

    case NOTIFICATION_ERROR_KINDS.SERVER:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.SERVER,
        title: "The notification service failed",
        message:
          "The notification service could not complete the request. Try again later.",
        recovery: NOTIFICATION_RECOVERY.RETRY,
      };

    default:
      return {
        category: NOTIFICATION_ERROR_CATEGORIES.UNKNOWN,
        title: "Notifications could not be loaded",
        message: "An unexpected notification error occurred. Try again.",
        recovery: NOTIFICATION_RECOVERY.RETRY,
      };
  }
};

const recoveryLabelFor = (recovery) => {
  if (recovery === NOTIFICATION_RECOVERY.SIGN_IN) {
    return "Sign in again";
  }

  if (recovery === NOTIFICATION_RECOVERY.RETRY) {
    return "Retry";
  }

  return "";
};

export const classifyNotificationError = (error) => {
  const kind = kindOf(error);
  const description = descriptionFor(kind);

  const requiresSignIn =
    description.recovery === NOTIFICATION_RECOVERY.SIGN_IN;

  const retryable =
    description.recovery === NOTIFICATION_RECOVERY.RETRY;

  return {
    kind,
    category: description.category,
    status: statusOf(error) || null,
    title: description.title,
    message: description.message,
    recovery: description.recovery,
    recoveryLabel: recoveryLabelFor(description.recovery),

    // Normalised Sprint 3 interface.
    retryable,
    requiresSignIn,

    // Backwards-compatible fields used by NotificationList.
    canRetry: retryable,
    needsSignIn: requiresSignIn,
  };
};

export const NOTIFICATION_ACTION_LABELS = Object.freeze({
  markRead: "mark that notification as read",
  markUnread: "mark that notification as unread",
  markAllRead: "mark every notification as read",
  delete: "delete that notification",
});

export const describeMutationFailure = (action, error) => {
  const classified = classifyNotificationError(error);

  const what =
    NOTIFICATION_ACTION_LABELS[action] ||
    "complete that change";

  if (classified.requiresSignIn) {
    return {
      ...classified,
      message:
        classified.kind === NOTIFICATION_ERROR_KINDS.UNAUTHORISED
          ? `Could not ${what}: your session has expired. Sign in again. Nothing was changed.`
          : `Could not ${what}: authentication is required. Sign in again. Nothing was changed.`,
    };
  }

  return {
    ...classified,
    message: `Could not ${what}. ${classified.message} Nothing was changed.`,
  };
};