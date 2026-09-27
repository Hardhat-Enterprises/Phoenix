import { act, renderHook, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { getNotificationUnreadCount } from "../services/phoenixApi";
import useNotificationUnreadCount from "./useNotificationUnreadCount";

vi.mock("../services/phoenixApi", () => ({
  getNotificationUnreadCount: vi.fn(),
}));

describe("useNotificationUnreadCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the unread count when enabled", async () => {
    getNotificationUnreadCount.mockResolvedValueOnce({
      unreadCount: 7,
    });

    const { result } = renderHook(() =>
      useNotificationUnreadCount({
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(7);
    });

    expect(getNotificationUnreadCount).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it("does not request data while logged out", async () => {
    const { result } = renderHook(() =>
      useNotificationUnreadCount({
        enabled: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.isLoading).toBe(false);
    });

    expect(getNotificationUnreadCount).not.toHaveBeenCalled();
  });

  it("supports manual refresh", async () => {
    getNotificationUnreadCount
      .mockResolvedValueOnce({ unreadCount: 2 })
      .mockResolvedValueOnce({ unreadCount: 9 });

    const { result } = renderHook(() =>
      useNotificationUnreadCount({
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(2);
    });

    await act(async () => {
      await result.current.refreshUnreadCount();
    });

    expect(result.current.unreadCount).toBe(9);
    expect(getNotificationUnreadCount).toHaveBeenCalledTimes(2);
  });

  it("refreshes when phoenix:notifications-changed is dispatched", async () => {
    getNotificationUnreadCount
      .mockResolvedValueOnce({ unreadCount: 1 })
      .mockResolvedValueOnce({ unreadCount: 4 });

    const { result } = renderHook(() =>
      useNotificationUnreadCount({
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(1);
    });

    act(() => {
      window.dispatchEvent(
        new Event("phoenix:notifications-changed"),
      );
    });

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(4);
    });

    expect(getNotificationUnreadCount).toHaveBeenCalledTimes(2);
  });

  it("handles REST failure without breaking the header state", async () => {
    getNotificationUnreadCount.mockRejectedValueOnce(
      new Error("Notification service unavailable"),
    );

    const { result } = renderHook(() =>
      useNotificationUnreadCount({
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.error).toBe(
      "Notification service unavailable",
    );
  });

  it("exposes zero after logout", async () => {
    getNotificationUnreadCount.mockResolvedValueOnce({
      unreadCount: 12,
    });

    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useNotificationUnreadCount({
          enabled,
        }),
      {
        initialProps: {
          enabled: true,
        },
      },
    );

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(12);
    });

    rerender({
      enabled: false,
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("normalizes counts above zero and does not return negative values", async () => {
    getNotificationUnreadCount.mockResolvedValueOnce({
      unread_count: -4,
    });

    const { result } = renderHook(() =>
      useNotificationUnreadCount({
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.unreadCount).toBe(0);
  });
});