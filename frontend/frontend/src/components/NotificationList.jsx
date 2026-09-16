import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  countUnread,
  deriveListView,
  filterNotifications,
  hasMarkAllReadWork,
  isUnread,
  LIST_VIEWS,
  markAllReadInList,
  markReadInList,
  mutationKey,
  removeFromList,
} from "../services/notificationListState";
import {
  classifyNotificationError,
  describeMutationFailure,
} from "../services/notificationErrors";
import { formatRelativeTime } from "../services/notificationAdapter";
import { METADATA_STATUS } from "../services/notificationMetadata";
import "./notifier.css";

// ---------------------------------------------------------------------------
// The notification list, built entirely from what it is given: records to show,
// callbacks to invoke, and a description of where they came from. It imports no
// API module, so it renders identically against the mock provider, the real
// gateway adapter, or a test double, and it can be developed while both of
// those are still being written.
// ---------------------------------------------------------------------------

// Relative labels are re-rendered on this interval so an open panel does not
// keep claiming "Just now" long after the fact.
const CLOCK_TICK_MS = 30_000;

const DEFAULT_PROVIDER = Object.freeze({
  id: "unknown",
  label: "Notification provider",
  persists: false,
  isMock: false,
});

// Two vocabularies for the same action. Which one is used depends only on
// whether the injected action actually reaches a server, so a local change can
// never be described as a saved one.
const ACTION_FEEDBACK = Object.freeze({
  markRead: {
    saved: "Marked as read.",
    local: "Marked as read in this view only - not saved to the server.",
  },
  markAllRead: {
    saved: "All notifications marked as read.",
    local:
      "All notifications marked as read in this view only - not saved to the server.",
  },
  delete: {
    saved: "Notification deleted.",
    local:
      "Removed from this view only - not deleted on the server. A refresh brings it back.",
  },
});

const timeLabel = (item, now) => {
  if (item.createdAtDate) {
    return formatRelativeTime(item.createdAtDate, now);
  }

  // An unparseable value is still worth showing verbatim; a missing one has to
  // say so, because a blank cell reads as a rendering bug.
  return item.createdAtRaw
    ? `Reported as "${item.createdAtRaw}"`
    : "Time not provided";
};

export default function NotificationList({
  // Data and state, injected by whatever loads notifications.
  notifications = [],
  status = "ready",
  error = null,
  provider = DEFAULT_PROVIDER,
  // Search and filter controls live outside this component; it only reads the
  // result of them.
  filters = null,
  // Injected mutations. A null action hides the control it belongs to instead
  // of offering something that cannot work.
  actions = {},
  onRefresh,
  onRetry,
  onSignIn,
  onClose,
  heading = "Notifications",
  // Injectable clock, so timestamp rendering is deterministic under test.
  now: nowOverride,
}) {
  const {
    markRead: markReadAction,
    markAllRead: markAllReadAction,
    delete: deleteAction,
  } = actions;

  // Optimistic overlay over the injected records. null means "show exactly
  // what was injected"; a value means a local change is standing in front of
  // it, and is thrown away as soon as fresh data arrives.
  const [overlay, setOverlay] = useState(null);
  const [pendingKeys, setPendingKeys] = useState(() => []);
  const [mutationFailure, setMutationFailure] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  // A provider that claims to persist has still proved nothing until one of its
  // actions succeeds, so the disclaimer stays up until then.
  const [persistConfirmed, setPersistConfirmed] = useState(false);
  const [now, setNow] = useState(() => nowOverride || new Date());

  const panelRef = useRef(null);
  const modalCloseRef = useRef(null);
  const itemRefs = useRef(new Map());
  // Checked synchronously, so a double click cannot start the same mutation
  // twice before React has re-rendered the disabled button.
  const pendingRef = useRef(new Set());
  // The list as currently displayed, captured for rollback.
  const workingRef = useRef(notifications);
  const focusAfterRenderRef = useRef(null);
  const hadModalRef = useRef(false);
  const lastOpenedRef = useRef(null);
  const initialFocusRef = useRef(false);

  const items = overlay ?? notifications;
  const visibleItems = useMemo(
    () => filterNotifications(items, filters),
    [items, filters],
  );
  const unreadCount = countUnread(items);
  const view = deriveListView({ status, items, visibleItems, filters });

  // Fresh data from the provider always wins over a local overlay.
  useEffect(() => {
    setOverlay(null);
    workingRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    workingRef.current = items;
  }, [items]);

  useEffect(() => {
    if (nowOverride) {
      return undefined;
    }

    // Only tick while something on screen actually shows a relative time.
    if (!items.some((item) => item.createdAtDate)) {
      return undefined;
    }

    const timer = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);

    return () => clearInterval(timer);
  }, [items, nowOverride]);

  const setWorking = useCallback((next) => {
    workingRef.current = next;
    setOverlay(next);
  }, []);

  const registerItem = useCallback(
    (id) => (node) => {
      const key = String(id);

      if (node) {
        itemRefs.current.set(key, node);
      } else {
        itemRefs.current.delete(key);
      }
    },
    [],
  );

  const focusItem = useCallback((id) => {
    const node = itemRefs.current.get(String(id));

    if (node) {
      node.focus();
      return true;
    }

    return false;
  }, []);

  // Render-time checks read the state mirror; the synchronous guard inside
  // runMutation reads the ref, which is what makes a double click a no-op.
  const isPending = useCallback((key) => pendingKeys.includes(key), [pendingKeys]);

  const anyPending = pendingKeys.length > 0;

  const runMutation = useCallback(
    async ({ action, id, run, optimistic, onSuccessFocus }) => {
      if (typeof run !== "function") {
        return;
      }

      const key = mutationKey(action, id);

      // Prevent duplicate mutations while one is in flight.
      if (pendingRef.current.has(key)) {
        return;
      }

      const previous = workingRef.current;

      pendingRef.current.add(key);
      setPendingKeys(Array.from(pendingRef.current));
      setMutationFailure(null);
      setWorking(optimistic(previous));

      try {
        await run();

        if (provider.persists) {
          setPersistConfirmed(true);
        }

        const feedback = ACTION_FEEDBACK[action];
        setAnnouncement(
          feedback ? (provider.persists ? feedback.saved : feedback.local) : "",
        );

        if (onSuccessFocus) {
          focusAfterRenderRef.current = onSuccessFocus;
        }
      } catch (actionError) {
        // Put the list back exactly as it was before the optimistic change.
        setWorking(previous);
        const failure = describeMutationFailure(action, actionError);
        setMutationFailure(failure);
        setAnnouncement(failure.message);
      } finally {
        pendingRef.current.delete(key);
        setPendingKeys(Array.from(pendingRef.current));
      }
    },
    [provider.persists, setWorking],
  );

  const handleMarkRead = useCallback(
    (item) => {
      if (!markReadAction || !isUnread(item)) {
        return;
      }

      runMutation({
        action: "markRead",
        id: item.id,
        run: () => markReadAction(item.id),
        optimistic: (list) => markReadInList(list, item.id),
      });
    },
    [markReadAction, runMutation],
  );

  const handleMarkAllRead = useCallback(() => {
    if (!markAllReadAction) {
      return;
    }

    runMutation({
      action: "markAllRead",
      run: () => markAllReadAction(),
      optimistic: (list) => markAllReadInList(list),
    });
  }, [markAllReadAction, runMutation]);

  const handleDelete = useCallback(
    (item) => {
      if (!deleteAction) {
        return;
      }

      // Where the keyboard goes once the row it was on is gone.
      const order = visibleItems.map((entry) => String(entry.id));
      const position = order.indexOf(String(item.id));
      const nextFocusId =
        order[position + 1] || order[position - 1] || null;

      runMutation({
        action: "delete",
        id: item.id,
        run: () => deleteAction(item.id),
        optimistic: (list) => removeFromList(list, item.id),
        onSuccessFocus: { id: nextFocusId },
      });

      if (String(selectedId) === String(item.id)) {
        setSelectedId(null);
      }
    },
    [deleteAction, runMutation, selectedId, visibleItems],
  );

  const handleSelect = useCallback(
    (item) => {
      setSelectedId(item.id);
      // Opening a notification is the moment it has been read.
      handleMarkRead(item);
    },
    [handleMarkRead],
  );

  const closeModal = useCallback(() => setSelectedId(null), []);

  const selected = useMemo(
    () =>
      selectedId === null
        ? null
        : items.find((item) => String(item.id) === String(selectedId)) || null,
    [items, selectedId],
  );

  // Escape closes the panel, or the modal first when one is open.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      event.stopPropagation();

      if (selected) {
        closeModal();
        return;
      }

      onClose?.();
    };

    const panel = panelRef.current;
    panel?.addEventListener("keydown", handleKeyDown);

    return () => panel?.removeEventListener("keydown", handleKeyDown);
  }, [selected, onClose, closeModal]);

  useEffect(() => {
    if (selectedId !== null) {
      lastOpenedRef.current = selectedId;
    }
  }, [selectedId]);

  // The single owner of focus inside the panel. Running on every render and
  // acting only on transitions keeps the three focus rules — a requested move
  // after a list change, the modal opening, and the modal closing — from
  // fighting each other, which is what happens when each owns its own effect.
  useEffect(() => {
    const requested = focusAfterRenderRef.current;

    if (requested) {
      focusAfterRenderRef.current = null;

      if (!(requested.id && focusItem(requested.id))) {
        panelRef.current?.focus();
      }

      return;
    }

    if (selected) {
      // Only on the way in, so a re-render while the modal is open does not
      // pull focus off whatever the reader moved to inside it.
      if (!hadModalRef.current) {
        hadModalRef.current = true;
        modalCloseRef.current?.focus();
      }

      return;
    }

    if (hadModalRef.current) {
      hadModalRef.current = false;

      // Back to the row that opened it, or the panel if that row is gone.
      if (!focusItem(lastOpenedRef.current)) {
        panelRef.current?.focus();
      }

      return;
    }

    if (!initialFocusRef.current) {
      initialFocusRef.current = true;
      panelRef.current?.focus();
    }
  });

  // Arrow keys walk the list, so the whole panel is reachable without a mouse.
  const handleListKeyDown = (event) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];

    if (!keys.includes(event.key)) {
      return;
    }

    const order = visibleItems.map((item) => String(item.id));

    if (order.length === 0) {
      return;
    }

    const activeId = order.find(
      (id) => itemRefs.current.get(id) === document.activeElement,
    );
    const currentIndex = activeId ? order.indexOf(activeId) : -1;

    let nextIndex = currentIndex;

    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, order.length - 1);
    } else if (event.key === "ArrowUp") {
      nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else {
      nextIndex = order.length - 1;
    }

    event.preventDefault();
    focusItem(order[nextIndex]);
  };

  const isInitialLoading = status === "loading" && items.length === 0;
  const isRefreshing = status === "refreshing" || (status === "loading" && items.length > 0);
  const loadFailure = status === "error" && error ? classifyNotificationError(error) : null;
  // A failed refresh keeps the last good list on screen and reports the failure
  // beside it, rather than replacing readable content with an error page.
  const showBlockingError = view === LIST_VIEWS.BLOCKING_ERROR && loadFailure;
  const showInlineError = Boolean(loadFailure) && items.length > 0;
  const retryLabel = isRefreshing || isInitialLoading ? "Retrying..." : "Retry";

  const canMarkAllRead =
    Boolean(markAllReadAction) &&
    hasMarkAllReadWork(items) &&
    !isPending(mutationKey("markAllRead"));

  // Which persistence story the footer tells. "unconfirmed" is the narrow case
  // of a provider that claims to save but has not yet done so in this session.
  const persistenceMode = !provider.persists
    ? "local"
    : persistConfirmed
      ? "confirmed"
      : "unconfirmed";

  const renderRecovery = (failure, { inline = false } = {}) => {
    if (failure.needsSignIn) {
      return onSignIn ? (
        <button type="button" className="notif-retry" onClick={onSignIn}>
          {failure.recoveryLabel}
        </button>
      ) : (
        <p className="notif-error-text">{failure.recoveryLabel} to continue.</p>
      );
    }

    const retry = inline ? onRefresh || onRetry : onRetry || onRefresh;

    return retry ? (
      <button
        type="button"
        className="notif-retry"
        onClick={retry}
        disabled={isRefreshing || isInitialLoading}
      >
        {retryLabel}
      </button>
    ) : null;
  };

  return (
    <div
      className="notif-panel"
      role="dialog"
      aria-label={heading}
      tabIndex={-1}
      ref={panelRef}
    >
      <div className="notif-header">
        <h3 className="notif-heading">
          {heading}
          {unreadCount > 0 && (
            <span className="notif-count">{unreadCount} unread</span>
          )}
        </h3>
        <div className="notif-header-actions">
          {markAllReadAction && (
            <button
              type="button"
              className="notif-markall"
              onClick={handleMarkAllRead}
              disabled={!canMarkAllRead}
            >
              {isPending(mutationKey("markAllRead"))
                ? "Marking..."
                : "Mark all read"}
            </button>
          )}
          {onRefresh && (
            <button
              type="button"
              className="notif-refresh"
              onClick={onRefresh}
              disabled={isInitialLoading || isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          )}
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

      {/* One polite live region for every state change worth hearing. Two
          regions would compete, and a screen reader would read whichever won
          the race. */}
      <p className="notif-visually-hidden" role="status" aria-live="polite">
        {anyPending ? "Working..." : announcement}
      </p>

      {isInitialLoading && (
        <p className="notif-loading" role="status">
          Loading notifications...
        </p>
      )}

      {isRefreshing && items.length > 0 && (
        <p className="notif-refreshing" role="status">
          Checking for new notifications...
        </p>
      )}

      {showBlockingError && (
        <div className="notif-error" role="alert">
          <p className="notif-error-title">{loadFailure.title}</p>
          <p className="notif-error-text">{loadFailure.message}</p>
          {renderRecovery(loadFailure)}
        </div>
      )}

      {showInlineError && (
        <div className="notif-error notif-error-inline" role="alert">
          <p className="notif-error-text">
            {loadFailure.message} Showing the last notifications loaded.
          </p>
          {renderRecovery(loadFailure, { inline: true })}
        </div>
      )}

      {mutationFailure && (
        <div className="notif-error notif-mutation-error" role="alert">
          <p className="notif-error-text">{mutationFailure.message}</p>
          {mutationFailure.needsSignIn && onSignIn && (
            <button type="button" className="notif-retry" onClick={onSignIn}>
              {mutationFailure.recoveryLabel}
            </button>
          )}
        </div>
      )}

      {view === LIST_VIEWS.EMPTY && (
        <p className="notif-empty">No notifications.</p>
      )}

      {view === LIST_VIEWS.NO_MATCHES && (
        <p className="notif-empty notif-no-matches">
          No notifications match the current search or filters.
          {items.length > 0 && ` ${items.length} hidden.`}
        </p>
      )}

      {view === LIST_VIEWS.ITEMS && (
        <ul
          className="notif-list"
          onKeyDown={handleListKeyDown}
          aria-label={`${visibleItems.length} notifications`}
        >
          {visibleItems.map((item) => {
            const readPending = isPending(mutationKey("markRead", item.id));
            const deletePending = isPending(mutationKey("delete", item.id));
            const rowPending = readPending || deletePending;

            return (
              <li
                key={item.id}
                className={`notif-item ${
                  item.hasReadState ? (item.read ? "read" : "unread") : ""
                } ${selected && String(selected.id) === String(item.id) ? "selected" : ""} ${
                  rowPending ? "notif-item-pending" : ""
                }`}
              >
                <button
                  type="button"
                  className="notif-item-main"
                  onClick={() => handleSelect(item)}
                  ref={registerItem(item.id)}
                  aria-busy={rowPending || undefined}
                >
                  <span className="notif-title">
                    {isUnread(item) && (
                      <span className="notif-dot" aria-hidden="true" />
                    )}
                    {item.title}
                    {item.hasReadState && (
                      <span className="notif-visually-hidden">
                        {item.read ? " Read" : " Unread"}
                      </span>
                    )}
                  </span>
                  {item.message && (
                    <span className="notif-description">{item.message}</span>
                  )}
                  <span className="notif-meta">
                    {item.eventType && item.eventType !== item.title && (
                      <span className="notif-eventtype">{item.eventType}</span>
                    )}
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
                        {timeLabel(item, now)}
                      </time>
                    ) : (
                      <span className="notif-time-unknown">
                        {timeLabel(item, now)}
                      </span>
                    )}
                  </span>
                </button>
                {deleteAction && (
                  <button
                    type="button"
                    className="notif-dismiss"
                    onClick={() => handleDelete(item)}
                    disabled={deletePending}
                    aria-label={
                      provider.persists
                        ? `Delete ${item.title}`
                        : `Remove ${item.title} from this view only`
                    }
                  >
                    &times;
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 && persistenceMode !== "confirmed" && (
        <div className="notif-footer">
          <p className="notif-local-note">
            {persistenceMode === "local"
              ? `Mark as read and remove change this view only. ${
                  provider.isMock
                    ? "This panel is running on mock notification data"
                    : "The backend does not accept notification updates yet"
                }, so nothing is saved and a refresh restores the full list.`
              : "Changes are sent to the notification service. None has been confirmed saved in this session yet."}
          </p>
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
              {selected.eventType && (
                <>
                  <dt>Event type</dt>
                  <dd>{selected.eventType}</dd>
                </>
              )}
              {selected.severity && (
                <>
                  <dt>Severity</dt>
                  <dd>{selected.severity}</dd>
                </>
              )}
              <dt>Received</dt>
              <dd>
                {selected.createdAtIso ? (
                  <time dateTime={selected.createdAtIso}>
                    {selected.createdAtExact}
                  </time>
                ) : (
                  timeLabel(selected, now)
                )}
              </dd>
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

            {selected.metadata?.entries?.length > 0 && (
              <>
                <h5 className="notif-modal-subtitle">Details</h5>
                <dl className="notif-modal-facts notif-metadata">
                  {selected.metadata.entries.map((entry) => (
                    <div className="notif-metadata-row" key={entry.key}>
                      <dt>{entry.label}</dt>
                      <dd>{entry.value}</dd>
                    </div>
                  ))}
                </dl>
                {selected.metadata.hiddenCount > 0 && (
                  <p className="notif-modal-note">
                    {selected.metadata.hiddenCount} further detail
                    {selected.metadata.hiddenCount === 1 ? "" : "s"} not shown.
                  </p>
                )}
              </>
            )}

            {selected.metadata?.status === METADATA_STATUS.MALFORMED && (
              <p className="notif-metadata-warning">
                This notification carried details that are not readable, so they
                are shown exactly as sent:{" "}
                <code className="notif-metadata-raw">
                  {selected.metadata.raw}
                </code>
              </p>
            )}

            <div className="notif-modal-actions">
              <button
                type="button"
                className="notif-btn-primary"
                onClick={closeModal}
                ref={modalCloseRef}
              >
                Close
              </button>
              {deleteAction && (
                <button
                  type="button"
                  className="notif-btn-secondary"
                  onClick={() => handleDelete(selected)}
                  disabled={isPending(mutationKey("delete", selected.id))}
                >
                  {provider.persists ? "Delete" : "Remove from this view"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
