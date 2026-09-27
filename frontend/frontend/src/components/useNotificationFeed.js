import { useCallback, useEffect, useRef, useState } from "react";
import { adaptNotifications } from "../services/notificationAdapter";

// ---------------------------------------------------------------------------
// Turns a notification provider into the data and callbacks the list renders
// from. The provider is injected, so the same hook drives the mock provider,
// the real API adapter, and a test double, and the list itself never learns
// which one it has.
//
// A provider is any object shaped like:
//   { list(), markRead(id), markAllRead(), remove(id), persists, isMock, label }
// Only list() is required; a missing mutation is reported as unsupported rather
// than called.
// ---------------------------------------------------------------------------

export const FEED_STATUS = Object.freeze({
  IDLE: "idle",
  // First load, with nothing on screen yet: the panel shows a loading message.
  LOADING: "loading",
  // A reload while a previous list is still on screen: the list stays put and
  // only a quiet indicator changes, because replacing readable content with a
  // spinner loses the reader's place.
  REFRESHING: "refreshing",
  READY: "ready",
  ERROR: "error",
});

const itemsFrom = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.notifications)) {
    return response.notifications;
  }

  return [];
};

const unsupported = (action) => () => {
  const error = new Error(
    `This notification provider does not support ${action}.`,
  );
  error.code = "UNSUPPORTED_ACTION";
  return Promise.reject(error);
};

export const useNotificationFeed = ({
  provider,
  // The raw-record transform is injectable so a caller can supply records that
  // are already adapted.
  adapt = adaptNotifications,
  autoLoad = true,
} = {}) => {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState(
    autoLoad ? FEED_STATUS.LOADING : FEED_STATUS.IDLE,
  );
  const [error, setError] = useState(null);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  // The last successful list, read inside load() so a refresh can tell whether
  // it is a first load without depending on a stale closure over state.
  const itemsRef = useRef([]);
  // Guards against an earlier slow response overwriting a later one.
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!provider?.list) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const hadItems = itemsRef.current.length > 0;
    setStatus(hadItems ? FEED_STATUS.REFRESHING : FEED_STATUS.LOADING);
    setError(null);

    try {
      const response = await provider.list();

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      const next = adapt(itemsFrom(response));
      itemsRef.current = next;
      setItems(next);
      setStatus(FEED_STATUS.READY);
      setLastLoadedAt(new Date());
    } catch (loadError) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      // items is deliberately left alone: a failed refresh reports itself
      // beside the last list that did load, and never erases it.
      setError(loadError);
      setStatus(FEED_STATUS.ERROR);
    }
  }, [provider, adapt]);

  useEffect(() => {
    if (!autoLoad) {
      return undefined;
    }

    let cancelled = false;

    // Deferred by a microtask so the first request is started after the render
    // has committed rather than during it. The initial status is already
    // "loading", so nothing flickers while it waits.
    Promise.resolve().then(() => {
      if (!cancelled) {
        load();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [autoLoad, load]);

  const markRead = useCallback(
    (id) =>
      provider?.markRead
        ? provider.markRead(id)
        : unsupported("marking a notification read")(),
    [provider],
  );

  const markAllRead = useCallback(
    () =>
      provider?.markAllRead
        ? provider.markAllRead()
        : unsupported("marking every notification read")(),
    [provider],
  );

  const remove = useCallback(
    (id) =>
      provider?.remove
        ? provider.remove(id)
        : unsupported("deleting a notification")(),
    [provider],
  );

  return {
    notifications: items,
    status,
    error,
    lastLoadedAt,
    // Both names point at the same load; the list uses "retry" from an error
    // state and "refresh" from a populated one so the button wording matches
    // what the reader is doing.
    refresh: load,
    retry: load,
    actions: {
      markRead: provider?.markRead ? markRead : null,
      markAllRead: provider?.markAllRead ? markAllRead : null,
      delete: provider?.remove ? remove : null,
    },
    provider: {
      id: provider?.id || "unknown",
      label: provider?.label || "Notification provider",
      persists: Boolean(provider?.persists),
      isMock: Boolean(provider?.isMock),
    },
  };
};

export default useNotificationFeed;
