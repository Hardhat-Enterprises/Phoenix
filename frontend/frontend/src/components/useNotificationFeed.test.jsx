import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import useNotificationFeed, { FEED_STATUS } from "./useNotificationFeed";

// The hook is driven by an injected provider, so these tests need no API layer
// and no network.

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const provider = (overrides = {}) => ({
  id: "test",
  label: "Test provider",
  persists: false,
  isMock: true,
  list: vi.fn().mockResolvedValue({
    items: [
      { id: "a", title: "Alpha", created_at: "2026-09-14T11:00:00.000Z" },
      { id: "b", title: "Beta", created_at: "2026-09-14T10:00:00.000Z" },
    ],
  }),
  markRead: vi.fn().mockResolvedValue({}),
  markAllRead: vi.fn().mockResolvedValue({}),
  remove: vi.fn().mockResolvedValue({}),
  ...overrides,
});

describe("useNotificationFeed", () => {
  it("loads on mount and adapts what the provider returned", async () => {
    const { result } = renderHook(() => useNotificationFeed({ provider: provider() }));

    expect(result.current.status).toBe(FEED_STATUS.LOADING);

    await waitFor(() => expect(result.current.status).toBe(FEED_STATUS.READY));
    expect(result.current.notifications.map((item) => item.id)).toEqual(["a", "b"]);
    expect(result.current.lastLoadedAt).toBeInstanceOf(Date);
  });

  it("does not load until asked when autoLoad is off", async () => {
    const source = provider();
    const { result } = renderHook(() =>
      useNotificationFeed({ provider: source, autoLoad: false }),
    );

    expect(result.current.status).toBe(FEED_STATUS.IDLE);
    expect(source.list).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toBe(FEED_STATUS.READY);
  });

  it("reports a reload as a background refresh, not a first load", async () => {
    const gate = deferred();
    const source = provider();
    const { result } = renderHook(() => useNotificationFeed({ provider: source }));

    await waitFor(() => expect(result.current.status).toBe(FEED_STATUS.READY));

    source.list.mockReturnValueOnce(gate.promise);
    act(() => {
      result.current.refresh();
    });

    // The previous list is still on screen, so this is a refresh.
    await waitFor(() => expect(result.current.status).toBe(FEED_STATUS.REFRESHING));
    expect(result.current.notifications).toHaveLength(2);

    await act(async () => {
      gate.resolve({ items: [{ id: "a", title: "Alpha" }] });
      await gate.promise;
    });

    expect(result.current.status).toBe(FEED_STATUS.READY);
  });

  it("keeps the last successful list when a refresh fails", async () => {
    const source = provider();
    const { result } = renderHook(() => useNotificationFeed({ provider: source }));

    await waitFor(() => expect(result.current.status).toBe(FEED_STATUS.READY));

    source.list.mockRejectedValueOnce(
      Object.assign(new Error("kaboom"), { status: 500 }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toBe(FEED_STATUS.ERROR);
    expect(result.current.error.status).toBe(500);
    // The records that did load are still there to read.
    expect(result.current.notifications.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("has nothing to preserve when the very first load fails", async () => {
    const source = provider({
      list: vi.fn().mockRejectedValue(
        Object.assign(new Error("Invalid token"), { status: 401 }),
      ),
    });
    const { result } = renderHook(() => useNotificationFeed({ provider: source }));

    await waitFor(() => expect(result.current.status).toBe(FEED_STATUS.ERROR));
    expect(result.current.notifications).toEqual([]);
  });

  it("ignores a slow response that a later one has already superseded", async () => {
    const slow = deferred();
    const source = provider();
    const { result } = renderHook(() => useNotificationFeed({ provider: source }));

    await waitFor(() => expect(result.current.status).toBe(FEED_STATUS.READY));

    source.list.mockReturnValueOnce(slow.promise);
    act(() => {
      result.current.refresh();
    });

    source.list.mockResolvedValueOnce({ items: [{ id: "late", title: "Late" }] });
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.notifications.map((item) => item.id)).toEqual(["late"]);

    // The earlier request finishing afterwards must not win.
    await act(async () => {
      slow.resolve({ items: [{ id: "stale", title: "Stale" }] });
      await slow.promise;
    });

    expect(result.current.notifications.map((item) => item.id)).toEqual(["late"]);
  });

  it("passes each action through to the provider", async () => {
    const source = provider();
    const { result } = renderHook(() => useNotificationFeed({ provider: source }));

    await waitFor(() => expect(result.current.status).toBe(FEED_STATUS.READY));

    await result.current.actions.markRead("a");
    await result.current.actions.markAllRead();
    await result.current.actions.delete("b");

    expect(source.markRead).toHaveBeenCalledWith("a");
    expect(source.markAllRead).toHaveBeenCalledTimes(1);
    expect(source.remove).toHaveBeenCalledWith("b");
  });

  it("reports an action the provider does not offer as absent, so its control can be hidden", async () => {
    const source = provider({ markAllRead: undefined, remove: undefined });
    const { result } = renderHook(() => useNotificationFeed({ provider: source }));

    await waitFor(() => expect(result.current.status).toBe(FEED_STATUS.READY));

    expect(result.current.actions.markRead).toBeTypeOf("function");
    expect(result.current.actions.markAllRead).toBeNull();
    expect(result.current.actions.delete).toBeNull();
  });

  it("describes the provider it is running on", async () => {
    const { result } = renderHook(() => useNotificationFeed({ provider: provider() }));

    await waitFor(() => expect(result.current.status).toBe(FEED_STATUS.READY));

    expect(result.current.provider).toEqual({
      id: "test",
      label: "Test provider",
      persists: false,
      isMock: true,
    });
  });

  it("reads a bare array or a notifications key, not just items", async () => {
    const asArray = renderHook(() =>
      useNotificationFeed({
        provider: provider({ list: vi.fn().mockResolvedValue([{ id: "z" }]) }),
      }),
    );

    await waitFor(() =>
      expect(asArray.result.current.notifications).toHaveLength(1),
    );

    const asNotifications = renderHook(() =>
      useNotificationFeed({
        provider: provider({
          list: vi.fn().mockResolvedValue({ notifications: [{ id: "y" }] }),
        }),
      }),
    );

    await waitFor(() =>
      expect(asNotifications.result.current.notifications).toHaveLength(1),
    );
  });

  it("does nothing at all without a provider", () => {
    const { result } = renderHook(() => useNotificationFeed({}));

    expect(result.current.notifications).toEqual([]);
    expect(result.current.actions.markRead).toBeNull();
  });
});
