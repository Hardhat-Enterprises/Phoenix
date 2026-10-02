import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createNotificationWebSocketClient,
  createWebSocketUrl,
  parseNotificationMetadata,
} from "./notificationWebSocket";

class MockWebSocket {
  static instances = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.sent = [];
    MockWebSocket.instances.push(this);
  }

  send(message) {
    this.sent.push(message);
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  receive(data) {
    this.onmessage?.({ data });
  }

  unexpectedClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: 1006, wasClean: false });
  }

  close(code = 1000, reason = "") {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason, wasClean: code === 1000 });
  }
}

describe("notificationWebSocket", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  const makeClient = (overrides = {}) =>
    createNotificationWebSocketClient({
      apiBaseUrl: "https://api.example.test",
      getAccessToken: () => "raw-jwt",
      WebSocketImpl: MockWebSocket,
      onEvent: vi.fn(),
      onStatusChange: vi.fn(),
      onError: vi.fn(),
      ...overrides,
    });

  it("derives ws and wss endpoint URLs without query tokens", () => {
    expect(createWebSocketUrl("http://localhost:3000")).toBe(
      "ws://localhost:3000/api/notifications/ws",
    );
    expect(createWebSocketUrl("https://api.example.test")).toBe(
      "wss://api.example.test/api/notifications/ws",
    );
  });

  it("authenticates immediately after open with exactly one Bearer prefix", () => {
    const client = makeClient();
    client.connect();
    const socket = MockWebSocket.instances[0];
    socket.open();

    expect(socket.url).not.toContain("raw-jwt");
    expect(socket.sent).toEqual([
      JSON.stringify({ type: "authenticate", token: "Bearer raw-jwt" }),
    ]);
  });

  it("does not duplicate Bearer", () => {
    const client = makeClient({ getAccessToken: () => "Bearer raw-jwt" });
    client.connect();
    MockWebSocket.instances[0].open();
    expect(JSON.parse(MockWebSocket.instances[0].sent[0]).token).toBe(
      "Bearer raw-jwt",
    );
  });

  it("sends the documented filtered snapshot request", () => {
    const client = makeClient();
    client.subscribe({ page: 1, limit: 10, read: false });
    client.connect();
    const socket = MockWebSocket.instances[0];
    socket.open();

    expect(JSON.parse(socket.sent[1])).toEqual({
      type: "notifications:subscribe",
      page: 1,
      limit: 10,
      read: false,
    });
  });

  it("defaults subscriptions and omits read when it is not supplied", () => {
    const client = makeClient();
    client.subscribe({});
    client.connect();
    const socket = MockWebSocket.instances[0];
    socket.open();
    expect(JSON.parse(socket.sent[1])).toEqual({
      type: "notifications:subscribe",
      page: 1,
      limit: 10,
    });
  });

  it("rejects invalid subscriptions locally", () => {
    const client = makeClient();
    expect(() => client.subscribe({ page: 0 })).toThrow();
    expect(() => client.subscribe({ limit: 101 })).toThrow();
    expect(() => client.subscribe({ read: "false" })).toThrow();
    expect(() => client.subscribe({ search: "x" })).toThrow();
  });

  it("forwards every documented event", () => {
    const onEvent = vi.fn();
    const client = makeClient({ onEvent });
    client.connect();
    const socket = MockWebSocket.instances[0];
    socket.open();

    const messages = [
      { type: "notification:authenticated" },
      {
        type: "notifications:snapshot",
        data: { notifications: [], pagination: {}, unreadCount: 0 },
      },
      { type: "notification:created", data: { notification: { id: "1" } } },
      { type: "notification:updated", data: { notification: { id: "1" } } },
      { type: "notifications:all-read", data: { updatedCount: 1 } },
      { type: "notification:deleted", data: { notificationId: "1" } },
      { type: "error", message: "Unauthorized" },
    ];

    messages.forEach((message) => socket.receive(JSON.stringify(message)));
    expect(onEvent).toHaveBeenCalledTimes(messages.length);
    messages.forEach((message) =>
      expect(onEvent).toHaveBeenCalledWith(message),
    );
  });

  it("reports invalid JSON safely without exposing raw payload", () => {
    const onError = vi.fn();
    const client = makeClient({ onError });
    client.connect();
    MockWebSocket.instances[0].open();
    MockWebSocket.instances[0].receive('{"token":"secret-jwt"');

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Received invalid WebSocket JSON" }),
    );
    expect(onError.mock.calls[0][0].message).not.toContain("secret-jwt");
  });

  it("reconnects after unexpected closure using capped backoff", () => {
    const onStatusChange = vi.fn();
    const client = makeClient({
      onStatusChange,
      reconnectBaseDelay: 100,
      reconnectMaxDelay: 250,
    });
    client.connect();
    MockWebSocket.instances[0].open();
    MockWebSocket.instances[0].unexpectedClose();

    expect(onStatusChange).toHaveBeenLastCalledWith("reconnecting");
    vi.advanceTimersByTime(100);
    expect(MockWebSocket.instances).toHaveLength(2);
    MockWebSocket.instances[1].open();
    expect(JSON.parse(MockWebSocket.instances[1].sent[0]).type).toBe(
      "authenticate",
    );
  });

  it("does not reconnect after intentional disconnect", () => {
    const client = makeClient();
    client.connect();
    MockWebSocket.instances[0].open();
    client.disconnect();
    vi.advanceTimersByTime(100_000);
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(client.getStatus()).toBe("closed");
  });

  it("parses metadata defensively", () => {
    expect(parseNotificationMetadata('{"severity":"critical"}')).toEqual({
      severity: "critical",
    });
    expect(parseNotificationMetadata("not-json")).toEqual({});
  });
});
