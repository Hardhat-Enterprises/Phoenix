// ---------------------------------------------------------------------------
// One place that turns a rejected request into something the panel can render:
// what went wrong, and what the reader can do about it. The panel never
// inspects status codes itself, so the wording for each class of failure is
// decided once, here.
// ---------------------------------------------------------------------------

export const NOTIFICATION_ERROR_KINDS = Object.freeze({
  VALIDATION: "validation",
  UNAUTHORISED: "unauthorised",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not-found",
  SERVER: "server",
  NETWORK: "network",
  UNKNOWN: "unknown",
});

// What the reader can do next. "sign-in" needs an authentication handler from
// the host app; "retry" only needs the injected refresh action.
export const NOTIFICATION_RECOVERY = Object.freeze({
  SIGN_IN: "sign-in",
  RETRY: "retry",
  NONE: "none",
});

const messageOf = (error) => String(error?.message || "").trim();

const looksLikeSignIn = (error) => {
  const text = messageOf(error).toLowerCase();

  return text.includes("sign in") || text.includes("unauthorized") || text.includes("unauthorised");
};

const looksLikeNetwork = (error) => {
  const text = messageOf(error).toLowerCase();

  return (
    text.includes("could not reach") ||
    text.includes("failed to fetch") ||
    text.includes("network") ||
    error?.name === "TypeError"
  );
};

const statusOf = (error) => {
  const status = Number(error?.status ?? error?.response?.status);

  return Number.isFinite(status) && status > 0 ? status : 0;
};

// A validation failure is the one case where the backend's own message is more
// useful than ours, because it names the field it rejected.
const validationDetail = (error) => {
  const data = error?.data;
  const candidates = [
    data?.errors,
    data?.error,
    data?.detail,
    data?.details,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }

    if (Array.isArray(candidate)) {
      const parts = candidate
        .map((item) =>
          typeof item === "string" ? item : item?.message || item?.msg || "",
        )
        .filter(Boolean);

      if (parts.length > 0) {
        return parts.join(" ");
      }
    }
  }

  return messageOf(error);
};

const describeKind = (kind, error) => {
  switch (kind) {
    case NOTIFICATION_ERROR_KINDS.VALIDATION:
      return {
        title: "That request was rejected",
        message:
          validationDetail(error) ||
          "The notification service rejected the request as invalid.",
        recovery: NOTIFICATION_RECOVERY.RETRY,
        recoveryLabel: "Try again",
      };

    case NOTIFICATION_ERROR_KINDS.UNAUTHORISED:
      return {
        title: "Your session has expired",
        message: "Sign in again to load your notifications.",
        recovery: NOTIFICATION_RECOVERY.SIGN_IN,
        recoveryLabel: "Sign in again",
      };

    case NOTIFICATION_ERROR_KINDS.FORBIDDEN:
      return {
        title: "You cannot view these notifications",
        message:
          "This account is not permitted to read notifications. Sign in with an account that is.",
        recovery: NOTIFICATION_RECOVERY.SIGN_IN,
        recoveryLabel: "Sign in as another user",
      };

    case NOTIFICATION_ERROR_KINDS.NOT_FOUND:
      return {
        title: "Notifications are unavailable",
        message:
          "The notifications endpoint is not available on the API gateway.",
        recovery: NOTIFICATION_RECOVERY.RETRY,
        recoveryLabel: "Retry",
      };

    case NOTIFICATION_ERROR_KINDS.SERVER:
      return {
        title: "The notification service failed",
        message:
          "The notification service could not complete the request. This is a problem on the server, not with your account.",
        recovery: NOTIFICATION_RECOVERY.RETRY,
        recoveryLabel: "Retry",
      };

    case NOTIFICATION_ERROR_KINDS.NETWORK:
      return {
        title: "The notification service is unreachable",
        message:
          "Could not reach the notification service. Check your connection and try again.",
        recovery: NOTIFICATION_RECOVERY.RETRY,
        recoveryLabel: "Retry",
      };

    default:
      return {
        title: "Notifications could not be loaded",
        message:
          messageOf(error) ||
          "Notifications could not be loaded from the notification service.",
        recovery: NOTIFICATION_RECOVERY.RETRY,
        recoveryLabel: "Retry",
      };
  }
};

const kindOf = (error) => {
  const status = statusOf(error);

  if (status === 400 || status === 422) return NOTIFICATION_ERROR_KINDS.VALIDATION;
  if (status === 401) return NOTIFICATION_ERROR_KINDS.UNAUTHORISED;
  if (status === 403) return NOTIFICATION_ERROR_KINDS.FORBIDDEN;
  if (status === 404) return NOTIFICATION_ERROR_KINDS.NOT_FOUND;
  if (status >= 500) return NOTIFICATION_ERROR_KINDS.SERVER;

  // Without a status the message is all we have. An expired session reaches us
  // this way when the API layer rejects before sending.
  if (looksLikeSignIn(error)) return NOTIFICATION_ERROR_KINDS.UNAUTHORISED;
  if (looksLikeNetwork(error)) return NOTIFICATION_ERROR_KINDS.NETWORK;

  return NOTIFICATION_ERROR_KINDS.UNKNOWN;
};

export const classifyNotificationError = (error) => {
  const kind = kindOf(error);
  const described = describeKind(kind, error);

  return {
    kind,
    status: statusOf(error) || null,
    ...described,
    needsSignIn: described.recovery === NOTIFICATION_RECOVERY.SIGN_IN,
    canRetry: described.recovery === NOTIFICATION_RECOVERY.RETRY,
  };
};

export const NOTIFICATION_ACTION_LABELS = Object.freeze({
  markRead: "mark that notification as read",
  markUnread: "mark that notification as unread",
  markAllRead: "mark every notification as read",
  delete: "delete that notification",
});

// A failed mutation has already been rolled back by the time this is shown, so
// the wording has to say that nothing changed — otherwise the reader cannot
// tell whether to try again.
export const describeMutationFailure = (action, error) => {
  const classified = classifyNotificationError(error);
  const what = NOTIFICATION_ACTION_LABELS[action] || "complete that change";

  if (classified.needsSignIn) {
    return {
      ...classified,
      message: `Could not ${what}: your session has expired. Nothing was changed.`,
    };
  }

  return {
    ...classified,
    message: `Could not ${what}. ${classified.message} Nothing was changed.`,
  };
};
