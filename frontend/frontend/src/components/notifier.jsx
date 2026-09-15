import { useCallback, useEffect, useRef, useState } from "react";
import {
  getNotifications,
  NOTIFICATION_MUTATIONS_SUPPORTED,
  NOTIFICATION_SEND_SUPPORTED,
} from "../services/phoenixApi";
import { adaptNotifications } from "../services/notificationAdapter";
import "./notifier.css";

// Feature flag for search functionality
const NOTIFICATION_SEARCH_ENABLED = false;

const needsSignIn = (error) =>
  error?.status === 401 ||
  String(error?.message || "")
    .toLowerCase()
    .includes("sign in");

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

//query state
const parseQueryString = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    search: params.get("search") || "",
    read: params.get("read") ?? null,
    page: parseInt(params.get("page") || "1", 10),
    limit: parseInt(params.get("limit") || "10", 10),
  };
};

const updateQueryString = (params, replace = false) => {
  const query = new URLSearchParams(window.location.search);

  if (params.search) {
    query.set("search", params.search);
  } else {
    query.delete("search");
  }

  if (params.read !== undefined && params.read !== null) {
    query.set("read", params.read);
  } else {
    query.delete("read");
  }

  if (params.page !== undefined && params.page !== null) {
    query.set("page", String(params.page));
  } else {
    query.delete("page");
  }

  if (params.limit !== undefined && params.limit !== null) {
    query.set("limit", String(params.limit));
  } else {
    query.delete("limit");
  }

  const queryString = query.toString();
  const newUrl = queryString ? `?${queryString}` : window.location.pathname;

  if (replace) {
    window.history.replaceState({}, "", newUrl);
  } else {
    window.history.pushState({}, "", newUrl);
  }
};

const mockLoader = (notifications) => {
  return async (params = {}, signal) => {
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    let filtered = [...notifications];

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(searchLower) ||
          (item.message && item.message.toLowerCase().includes(searchLower)),
      );
    }

    if (params.read !== undefined && params.read !== null) {
      const isRead = params.read === "true" || params.read === true;
      filtered = filtered.filter((item) => item.read === isRead);
    }

    //calculate pagination
    const total = filtered.length;
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, params.limit || 10);
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const items = filtered.slice(startIndex, endIndex);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  };
};

//generate mock notifications
const severities = ["Critical", "High", "Medium", "Low", "Info"];

const titles = [
  "System Alert",
  "Security Warning",
  "Performance Notice",
  "Update Available",
  "Backup Complete",
  "Login Attempt",
  "Configuration Change",
  "Scheduled Maintenance",
];

const mockNotifications = Array.from({ length: 50 }, (_, i) => ({
  id: `notif-${i + 1}`,
  title: `${titles[i % titles.length]} #${i + 1}`,
  message: `This is notification message ${i + 1} with some details about the event.`,
  severity: severities[i % severities.length],
  severityTone: severities[i % severities.length].toLowerCase(),
  createdAtIso: new Date(Date.now() - i * 3600000).toISOString(),
  createdAtDate: new Date(Date.now() - i * 3600000),
  createdAtLabel: `${Math.floor(i / 24) + 1} days ago`,
  createdAtExact: new Date(Date.now() - i * 3600000).toLocaleString(),
  read: i % 3 === 0,
  hasReadState: true,
  recipient: `user${i % 5}@example.com`,
}));

export default function NotificationPanel({
  onClose,
  notificationLoader,
  useMockData,
}) {
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  //search and filter state
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState(null); // null = All, false = Unread, true = Read
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Debounce and request management
  const searchTimerRef = useRef(null);
  const requestSequenceRef = useRef(0);
  const abortControllerRef = useRef(null);

  const panelRef = useRef(null);
  const modalCloseRef = useRef(null);
  const toastTimerRef = useRef(null);

  const unreadCount = notifications.filter(
    (item) => item.hasReadState && !item.read,
  ).length;

  const loadNotifications = useCallback(
    async (signal, params) => {
      const currentSequence = ++requestSequenceRef.current;
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = signal;

      setStatus("loading");
      setError(null);

      try {
        let response;

        if (useMockData && notificationLoader) {
          response = await notificationLoader(params, signal);
        } else {
          response = await getNotifications(params);
        }
        // GET /api/notifications takes no parameters in the current contract.
        //const response = await getNotifications();

        if (signal?.aborted) {
          return;
        }

        const items = adaptNotifications(response.items);
        setNotifications(items);
        setTotalPages(
          response.totalPages ||
            Math.ceil(
              (response.total || items.length) / (params.limit || limit),
            ),
        );
        setTotalResults(response.total || items.length);
        setStatus(items.length === 0 ? "empty" : "ready");
      } catch (requestError) {
        if (requestError.name === "AbortError" || signal?.aborted) {
          return;
        }

        if (currentSequence !== requestSequenceRef.current) {
          return;
        }

        setError(requestError);
        setStatus("error");
      }
    },
    [limit, useMockData, notificationLoader],
  );

  useEffect(() => {
    const query = parseQueryString();

    // Validate and restore query values
    const validPage = Math.max(1, query.page);
    const validLimit = [10, 20, 50, 100].includes(query.limit)
      ? query.limit
      : 10;
    const validRead =
      query.read === "true" ? true : query.read === "false" ? false : null;

    setSearch(query.search);
    setReadFilter(validRead);
    setPage(validPage);
    setLimit(validLimit);

    const controller = new AbortController();

    const fetchNotifications = async () => {
      await loadNotifications(controller.signal, {
        search: query.search,
        read: validRead,
        page: validPage,
        limit: validLimit,
      });
    };

    fetchNotifications();

    return () => controller.abort();
  }, [loadNotifications]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const query = parseQueryString();

      const validPage = Math.max(1, query.page);
      const validLimit = [10, 20, 50, 100].includes(query.limit)
        ? query.limit
        : 10;
      const validRead =
        query.read === "true" ? true : query.read === "false" ? false : null;

      setSearch(query.search);
      setReadFilter(validRead);
      setPage(validPage);
      setLimit(validLimit);

      const controller = new AbortController();
      loadNotifications(controller.signal, {
        search: query.search,
        read: validRead,
        page: validPage,
        limit: validLimit,
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [loadNotifications]);

  // Update URL when filters change (but not on initial load)
  useEffect(() => {
    // Don't update URL on first render
    if (status === "loading" && notifications.length === 0) {
      return;
    }

    updateQueryString({ search, read: readFilter, page, limit }, true);
  }, [search, readFilter, page, limit, status]);

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
  useEffect(() => () => clearTimeout(searchTimerRef.current), []);

  // Show a short-lived confirmation message.
  function showToast(message) {
    clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => setToastMessage(""), 3000);
  }

  // Debounced search handler
  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearch(value);

      // Debounce search input
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        setPage(1); // Reset to page 1 on search change

        const controller = new AbortController();
        loadNotifications(controller.signal, {
          search: value,
          read: readFilter,
          page: 1,
          limit,
        });
      }, 300);
    },
    [readFilter, limit, loadNotifications],
  );

  // Handle read filter change
  const handleReadFilterChange = useCallback(
    (newReadFilter) => {
      setReadFilter(newReadFilter);
      setPage(1); // Reset to page 1

      const controller = new AbortController();
      loadNotifications(controller.signal, {
        search,
        read: newReadFilter,
        page: 1,
        limit,
      });
    },
    [search, limit, loadNotifications],
  );

  // Handle page change
  const handlePageChange = useCallback(
    (newPage) => {
      const validPage = Math.max(1, Math.min(totalPages, newPage));
      setPage(validPage);

      const controller = new AbortController();
      loadNotifications(controller.signal, {
        search,
        read: readFilter,
        page: validPage,
        limit,
      });
    },
    [search, readFilter, limit, totalPages, loadNotifications],
  );

  // Handle limit change
  const handleLimitChange = useCallback(
    (e) => {
      const newLimit = parseInt(e.target.value, 10);
      setLimit(newLimit);
      setPage(1); // Reset to page 1

      const controller = new AbortController();
      loadNotifications(controller.signal, {
        search,
        read: readFilter,
        page: 1,
        limit: newLimit,
      });
    },
    [search, readFilter, loadNotifications],
  );

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
        showToast(
          "Marked as read on this device only - not saved to the server",
        );
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
            onClick={() => {
              const controller = new AbortController();
              loadNotifications(controller.signal, {
                search,
                read: readFilter,
                page,
                limit,
              });
            }}
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

      {/* Search and Filter Controls */}
      <div className="notif-controls">
        {NOTIFICATION_SEARCH_ENABLED && (
          <div className="notif-search-control">
            <label htmlFor="notif-search" className="notif-control-label">
              Search
            </label>
            <input
              id="notif-search"
              type="search"
              className="notif-search-input"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search notifications..."
              aria-label="Search notifications"
            />
          </div>
        )}

        <div className="notif-filter-control">
          <span className="notif-control-label">Filter:</span>
          <div
            className="notif-filter-buttons"
            role="group"
            aria-label="Filter by read status"
          >
            <button
              type="button"
              className={`notif-filter-btn ${readFilter === null ? "active" : ""}`}
              onClick={() => handleReadFilterChange(null)}
              aria-pressed={readFilter === null}
            >
              All
            </button>
            <button
              type="button"
              className={`notif-filter-btn ${readFilter === false ? "active" : ""}`}
              onClick={() => handleReadFilterChange(false)}
              aria-pressed={readFilter === false}
            >
              Unread
            </button>
            <button
              type="button"
              className={`notif-filter-btn ${readFilter === true ? "active" : ""}`}
              onClick={() => handleReadFilterChange(true)}
              aria-pressed={readFilter === true}
            >
              Read
            </button>
          </div>
        </div>

        <div className="notif-limit-control">
          <label htmlFor="notif-limit" className="notif-control-label">
            Results per page:
          </label>
          <select
            id="notif-limit"
            className="notif-limit-select"
            value={limit}
            onChange={handleLimitChange}
            aria-label="Results per page"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
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
            onClick={() => {
              const controller = new AbortController();
              loadNotifications(controller.signal, {
                search,
                read: readFilter,
                page,
                limit,
              });
            }}
          >
            Retry
          </button>
        </div>
      )}

      {status === "empty" && <p className="notif-empty">No notifications.</p>}

      {status === "ready" && (
        <>
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

          {/*Pagination Controls */}
          <div className="notif-pagination">
            <span className="notif-pagination-info">
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, totalResults)} of {totalResults} results
            </span>
            <div
              className="notif-pagination-buttons"
              role="group"
              aria-label="Pagination"
            >
              <button
                type="button"
                className="notif-page-btn"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                Previous
              </button>
              <span className="notif-page-indicator">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="notif-page-btn"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {status === "ready" && (
        <div className="notif-footer">
          <button
            type="button"
            className="notif-clear"
            onClick={handleClearAll}
          >
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
