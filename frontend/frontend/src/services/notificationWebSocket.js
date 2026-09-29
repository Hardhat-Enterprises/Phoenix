const RECOGNIZED_EVENTS = new Set([
  "notification:authenticated",
  "notifications:snapshot",
  "notification:created",
  "notification:updated",
  "notifications:all-read",
  "notification:deleted",
  "error",
]);

const DEFAULT_RECONNECT_BASE_DELAY = 500;
const DEFAULT_RECONNECT_MAX_DELAY = 10_000;

function createWebSocketUrl(apiBaseUrl) {
  const url = new URL(apiBaseUrl);
  if (url.protocol === "http:") url.protocol = "ws:";
  else if (url.protocol === "https:") url.protocol = "wss:";
  else throw new Error("apiBaseUrl must use http or https");

  url.pathname = `${url.pathname.replace(/\/$/, "")}/api/notifications/ws`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function addBearerOnce(token) {
  const value = String(token ?? "").trim();
  if (!value) throw new Error("Missing access token");
  return /^Bearer\s+/i.test(value) ? value : `Bearer ${value}`;
}

function validateSubscription(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Subscription must be an object");
  }

  const allowed = new Set(["page", "limit", "read"]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key))
      throw new TypeError(`Unsupported subscription field: ${key}`);
  }

  const page = input.page ?? 1;
  const limit = input.limit ?? 10;

  if (!Number.isInteger(page) || page < 1) {
    throw new TypeError("Subscription page must be a positive integer");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new TypeError("Subscription limit must be an integer from 1 to 100");
  }
  if (input.read !== undefined && typeof input.read !== "boolean") {
    throw new TypeError("Subscription read must be boolean when provided");
  }

  return {
    page,
    limit,
    ...(input.read !== undefined ? { read: input.read } : {}),
  };
}

function safeError(message) {
  return new Error(message || "Notification WebSocket error");
}

export function parseNotificationMetadata(metadata) {
  if (!metadata) return {};
  if (typeof metadata === "object") return metadata;
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

export function createNotificationWebSocketClient({
  apiBaseUrl,
  getAccessToken,
  onEvent = () => {},
  onStatusChange = () => {},
  onError = () => {},
  reconnect = true,
  reconnectBaseDelay = DEFAULT_RECONNECT_BASE_DELAY,
  reconnectMaxDelay = DEFAULT_RECONNECT_MAX_DELAY,
  WebSocketImpl = typeof WebSocket !== "undefined" ? WebSocket : undefined,
} = {}) {
  if (!apiBaseUrl) throw new TypeError("apiBaseUrl is required");
  if (typeof getAccessToken !== "function") {
    throw new TypeError("getAccessToken must be a function");
  }
  if (typeof WebSocketImpl !== "function") {
    throw new Error("WebSocket is not available");
  }

  let socket = null;
  let status = "idle";
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let intentionalDisconnect = false;
  let latestSubscription = null;
  let disposed = false;

  const setStatus = (nextStatus) => {
    status = nextStatus;
    onStatusChange(nextStatus);
  };

  const clearReconnectTimer = () => {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const isOpen = () => socket?.readyState === WebSocketImpl.OPEN;

  const send = (message) => {
    if (!isOpen()) return false;
    socket.send(JSON.stringify(message));
    return true;
  };

  const sendSubscription = () => {
    if (latestSubscription) {
      send({ type: "notifications:subscribe", ...latestSubscription });
    }
  };

  const scheduleReconnect = () => {
    if (
      !reconnect ||
      intentionalDisconnect ||
      disposed ||
      reconnectTimer !== null
    ) {
      return;
    }

    const delay = Math.min(
      reconnectMaxDelay,
      reconnectBaseDelay * 2 ** reconnectAttempt,
    );
    reconnectAttempt += 1;
    setStatus("reconnecting");
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const connect = () => {
    if (disposed) return;
    intentionalDisconnect = false;

    if (
      socket &&
      (socket.readyState === WebSocketImpl.CONNECTING ||
        socket.readyState === WebSocketImpl.OPEN)
    ) {
      return;
    }

    clearReconnectTimer();
    setStatus("connecting");

    const nextSocket = new WebSocketImpl(createWebSocketUrl(apiBaseUrl));
    socket = nextSocket;

    nextSocket.onopen = () => {
      if (socket !== nextSocket || disposed) return;

      try {
        const token = addBearerOnce(getAccessToken());
        send({ type: "authenticate", token });
        reconnectAttempt = 0;
        setStatus("open");
        sendSubscription();
      } catch (error) {
        onError(
          safeError(
            error.message === "Missing access token"
              ? error.message
              : "WebSocket authentication failed",
          ),
        );
      }
    };

    nextSocket.onmessage = ({ data }) => {
      if (socket !== nextSocket || disposed) return;

      let message;
      try {
        message = JSON.parse(data);
      } catch {
        onError(safeError("Received invalid WebSocket JSON"));
        return;
      }

      if (message && RECOGNIZED_EVENTS.has(message.type)) {
        onEvent(message);
      }
    };

    nextSocket.onerror = () => {
      if (socket === nextSocket && !disposed) {
        onError(safeError("Notification WebSocket error"));
      }
    };

    nextSocket.onclose = () => {
      if (socket === nextSocket) socket = null;
      if (disposed || intentionalDisconnect) {
        setStatus("closed");
        return;
      }
      setStatus("closed");
      scheduleReconnect();
    };
  };

  const subscribe = (subscription) => {
    latestSubscription = validateSubscription(subscription);
    if (status === "open") sendSubscription();
  };

  const disconnect = () => {
    intentionalDisconnect = true;
    clearReconnectTimer();

    const currentSocket = socket;
    socket = null;

    if (!currentSocket) {
      setStatus("closed");
      return;
    }

    setStatus("closing");
    currentSocket.onopen = null;
    currentSocket.onmessage = null;
    currentSocket.onerror = null;
    currentSocket.onclose = null;

    if (
      currentSocket.readyState === WebSocketImpl.CONNECTING ||
      currentSocket.readyState === WebSocketImpl.OPEN
    ) {
      currentSocket.close(1000, "User logged out");
    }
    setStatus("closed");
  };

  const dispose = () => {
    disposed = true;
    disconnect();
  };

  return {
    connect,
    subscribe,
    disconnect,
    dispose,
    getStatus: () => status,
  };
}

export { createWebSocketUrl, validateSubscription };
