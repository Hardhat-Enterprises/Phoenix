import { useCallback, useEffect, useRef, useState } from "react";
import {
  getNotifications,
  NOTIFICATION_MUTATIONS_SUPPORTED,
  NOTIFICATION_SEND_SUPPORTED,
} from "../services/phoenixApi";
import { adaptNotifications } from "../services/notificationAdapter";
import "./notifier.css";

const needsSignIn = (error) =>
  error?.status === 401 ||
  String(error?.message || "").toLowerCase().includes("sign in");

const describeError = (error) => {
  if (needsSignIn(error)) {
    return "Sign in to load your notifications.";
  }

  if (error?.status === 404) {
    return "The notifications endpoint is not available on the API gateway.";
  }

  return (
    error?.message ||
    "Notifications could not be loaded from the Phoenix API gateway."
  );
};

export default function NotificationPanel({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const panelRef = useRef(null);
  const modalCloseRef = useRef(null);
  const toastTimerRef = useRef(null);

  const unreadCount = notifications.filter(
    (item) => item.hasReadState && !item.read,
  ).length;

  const loadNotifications = useCallback(async (signal) => {
    setStatus("loading");
    setError(null);

    try {
      // GET /api/notifications takes no parameters in the current contract.
      const response = await getNotifications();

      if (signal?.aborted) {
        return;
      }

      const items = adaptNotifications(response.items);
      setNotifications(items);
      setStatus(items.length === 0 ? "empty" : "ready");
    } catch (requestError) {
      if (signal?.aborted) {
        return;
      }

      setError(requestError);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchNotifications = async () => {
      await loadNotifications(controller.signal);
    };

    fetchNotifications();

    return () => controller.abort();
  }, [loadNotifications]);

  // Escape closes the panel, or the modal first when one is open.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      event.stopPropagation();

      if (selected) {
        setSelected(null);
        return;
      }

      onClose?.();
    };

    const panel = panelRef.current;
    panel?.addEventListener("keydown", handleKeyDown);

    return () => panel?.removeEventListener("keydown", handleKeyDown);
  }, [selected, onClose]);

  // Focus follows the modal in and out so the keyboard never lands behind it.
  useEffect(() => {
    if (selected) {
      modalCloseRef.current?.focus();
    } else {
      panelRef.current?.focus();
    }
  }, [selected]);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // Show a short-lived confirmation message.
  function showToast(message) {
    clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => setToastMessage(""), 3000);
  }

  // Selecting a notification opens the detail modal. Marking it read is a
  // client-side change only until the backend exposes a mutation endpoint.
  function handleSelect(notification) {
    const becomesRead = notification.hasReadState && !notification.read;
    const opened = becomesRead ? { ...notification, read: true } : notification;

    if (becomesRead) {
      setNotifications((current) =>
        current.map((item) => (item.id === opened.id ? opened : item)),
      );

      if (!NOTIFICATION_MUTATIONS_SUPPORTED) {
        showToast("Marked as read on this device only - not saved to the server");
      }
    }

    setSelected(opened);
  }

  function handleDismiss(notification) {
    const remaining = notifications.filter(
      (item) => item.id !== notification.id,
    );

    setNotifications(remaining);
    setStatus(remaining.length === 0 ? "empty" : "ready");

    showToast(
      NOTIFICATION_MUTATIONS_SUPPORTED
        ? "Notification dismissed"
        : "Hidden on this device only - not saved to the server",
    );
  }

  function handleClearAll() {
    setNotifications([]);
    setStatus("empty");
    showToast(
      NOTIFICATION_MUTATIONS_SUPPORTED
        ? "All notifications cleared"
        : "Cleared on this device only - reload to see them again",
    );
  }

  const isLoading = status === "loading";

  return (
    <div
      className="notif-panel"
      role="dialog"
      aria-label="Notifications"
      tabIndex={-1}
      ref={panelRef}
    >
      <div className="notif-header">
        <h3 className="notif-heading">
          Notifications
          {unreadCount > 0 && (
            <span className="notif-count">{unreadCount} unread</span>
          )}
        </h3>
        <div className="notif-header-actions">
          <button
            type="button"
            className="notif-refresh"
            onClick={() => loadNotifications()}
            disabled={isLoading}
          >
            Refresh
          </button>
          {onClose && (
            <button
              type="button"
              className="notif-close"
              onClick={onClose}
              aria-label="Close notifications"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <p className="notif-loading" role="status">
          Loading notifications...
        </p>
      )}

      {status === "error" && (
        <div className="notif-error" role="alert">
          <p className="notif-error-text">{describeError(error)}</p>
          <button
            type="button"
            className="notif-retry"
            onClick={() => loadNotifications()}
          >
            Retry
          </button>
        </div>
      )}

      {status === "empty" && <p className="notif-empty">No notifications.</p>}

      {status === "ready" && (
        <ul className="notif-list">
          {notifications.map((item) => (
            <li
              key={item.id}
              className={`notif-item ${
                item.hasReadState ? (item.read ? "read" : "unread") : ""
              } ${selected && selected.id === item.id ? "selected" : ""}`}
            >
              <button
                type="button"
                className="notif-item-main"
                onClick={() => handleSelect(item)}
              >
                <span className="notif-title">
                  {item.hasReadState && !item.read && (
                    <span className="notif-dot" aria-hidden="true" />
                  )}
                  {item.title}
                  {item.hasReadState && !item.read && (
                    <span className="notif-visually-hidden">Unread</span>
                  )}
                </span>
                {item.message && (
                  <span className="notif-description">{item.message}</span>
                )}
                <span className="notif-meta">
                  {item.severity && (
                    <span
                      className={`notif-severity notif-severity-${item.severityTone}`}
                    >
                      {item.severity}
                    </span>
                  )}
                  {item.createdAtIso ? (
                    <time
                      dateTime={item.createdAtIso}
                      title={item.createdAtExact}
                    >
                      {item.createdAtLabel}
                    </time>
                  ) : (
                    item.createdAtLabel && <span>{item.createdAtLabel}</span>
                  )}
                </span>
              </button>
              <button
                type="button"
                className="notif-dismiss"
                onClick={() => handleDismiss(item)}
                aria-label={
                  NOTIFICATION_MUTATIONS_SUPPORTED
                    ? `Dismiss ${item.title}`
                    : `Hide ${item.title} on this device only`
                }
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      {status === "ready" && (
        <div className="notif-footer">
          <button type="button" className="notif-clear" onClick={handleClearAll}>
            {NOTIFICATION_MUTATIONS_SUPPORTED
              ? "Clear all"
              : "Clear all (this device only)"}
          </button>
          {!NOTIFICATION_MUTATIONS_SUPPORTED && (
            <p className="notif-local-note">
              Dismiss, clear and mark-as-read change this view only. The backend
              does not accept notification updates yet, so nothing is saved.
            </p>
          )}
        </div>
      )}

      {selected && (
        <div className="notif-modal-backdrop">
          <div
            className="notif-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-modal-title"
          >
            <h4 className="notif-modal-title" id="notif-modal-title">
              {selected.title}
            </h4>
            {selected.message && (
              <p className="notif-modal-body">{selected.message}</p>
            )}
            <dl className="notif-modal-facts">
              {selected.severity && (
                <>
                  <dt>Severity</dt>
                  <dd>{selected.severity}</dd>
                </>
              )}
              {selected.createdAtLabel && (
                <>
                  <dt>Received</dt>
                  <dd>{selected.createdAtExact || selected.createdAtLabel}</dd>
                </>
              )}
              {selected.recipient && (
                <>
                  <dt>Recipient</dt>
                  <dd>{selected.recipient}</dd>
                </>
              )}
              {selected.hasReadState && (
                <>
                  <dt>Status</dt>
                  <dd>{selected.read ? "Read" : "Unread"}</dd>
                </>
              )}
              <dt>Notification ID</dt>
              <dd className="notif-modal-id">{selected.id}</dd>
            </dl>
            {!NOTIFICATION_SEND_SUPPORTED && (
              <p className="notif-modal-note">
                Forwarding this notification is not available. The backend does
                not expose an alert send endpoint.
              </p>
            )}
            <div className="notif-modal-actions">
              <button
                type="button"
                className="notif-btn-primary"
                onClick={() => setSelected(null)}
                ref={modalCloseRef}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="notif-toast" role="status">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
