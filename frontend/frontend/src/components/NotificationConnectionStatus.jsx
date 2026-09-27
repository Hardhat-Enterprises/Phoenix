import { NOTIFICATION_CONNECTION_STATES } from "./notificationConnectionStates";

const STATUS_CONTENT = Object.freeze({
  [NOTIFICATION_CONNECTION_STATES.RECONNECTING]: {
    title: "Reconnecting notifications",
    message:
      "The notification connection was interrupted. PHOENIX is trying to reconnect.",
  },

  [NOTIFICATION_CONNECTION_STATES.UNAVAILABLE]: {
    title: "Notifications temporarily unavailable",
    message:
      "The notification service cannot be reached right now. You can try again.",
  },

  [NOTIFICATION_CONNECTION_STATES.AUTH_REQUIRED]: {
    title: "Sign in required",
    message:
      "Your notification connection could not be authenticated. Sign in again to continue.",
  },

  [NOTIFICATION_CONNECTION_STATES.CONNECTED]: {
    title: "Notifications connected again",
    message:
      "The notification connection has been restored.",
  },
});

export default function NotificationConnectionStatus({
  status,
  onRetry,
  onSignIn,
}) {
  const content = STATUS_CONTENT[status];

  if (!content) {
    return null;
  }

  const isReconnecting =
    status === NOTIFICATION_CONNECTION_STATES.RECONNECTING;

  const isUnavailable =
    status === NOTIFICATION_CONNECTION_STATES.UNAVAILABLE;

  const requiresSignIn =
    status === NOTIFICATION_CONNECTION_STATES.AUTH_REQUIRED;

  const isConnected =
    status === NOTIFICATION_CONNECTION_STATES.CONNECTED;

  return (
    <section
      className={`notification-connection-status notification-connection-status--${status}`}
      role={requiresSignIn || isUnavailable ? "alert" : "status"}
      aria-live={requiresSignIn || isUnavailable ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <div className="notification-connection-status__content">
        <p className="notification-connection-status__title">
          {content.title}
        </p>

        <p className="notification-connection-status__message">
          {content.message}
        </p>

        {isReconnecting && (
          <p
            className="notification-connection-status__progress"
            aria-label="Reconnection in progress"
          >
            Reconnection in progress...
          </p>
        )}

        {isUnavailable && onRetry && (
          <button
            type="button"
            className="notification-connection-status__action"
            onClick={onRetry}
          >
            Retry connection
          </button>
        )}

        {requiresSignIn && onSignIn && (
          <button
            type="button"
            className="notification-connection-status__action"
            onClick={onSignIn}
          >
            Sign in again
          </button>
        )}

        {isConnected && (
          <span className="sr-only">
            Live notification updates are available again.
          </span>
        )}
      </div>
    </section>
  );
}