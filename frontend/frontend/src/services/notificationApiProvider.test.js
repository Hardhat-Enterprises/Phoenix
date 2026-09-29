import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./phoenixApi", () => ({
  getNotifications: vi.fn().mockResolvedValue({ items: [] }),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  deleteNotification: vi.fn(),
}));

const load = async () => ({
  provider: (await import("./notificationApiProvider")).createApiNotificationProvider(),
  api: await import("./phoenixApi"),
});

describe("createApiNotificationProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports that API actions persist", async () => {
    const { provider } = await load();

    expect(provider.persists).toBe(true);
    expect(provider.isMock).toBe(false);
  });

  it("returns the saved notification after marking one read", async () => {
    const { provider, api } = await load();
    const notification = { id: "notification-1", is_read: true };
    api.markNotificationRead.mockResolvedValue({ data: { notification } });

    await expect(provider.markRead("notification-1")).resolves.toEqual({
      persisted: true,
      notification,
    });
    expect(api.markNotificationRead).toHaveBeenCalledWith("notification-1");
  });

  it.each([0, 3])("returns an updated count of %i after marking all read", async (updatedCount) => {
    const { provider, api } = await load();
    api.markAllNotificationsRead.mockResolvedValue({ data: { updatedCount } });

    await expect(provider.markAllRead()).resolves.toEqual({
      persisted: true,
      updatedCount,
    });
    expect(api.markAllNotificationsRead).toHaveBeenCalledTimes(1);
  });

  it("returns the requested ID after a successful delete", async () => {
    const { provider, api } = await load();
    api.deleteNotification.mockResolvedValue({ message: "Notification deleted" });

    await expect(provider.remove("notification-1")).resolves.toEqual({
      persisted: true,
      notificationId: "notification-1",
    });
    expect(api.deleteNotification).toHaveBeenCalledWith("notification-1");
  });

  it.each([
    ["markRead", "markNotificationRead", "notification-1"],
    ["markAllRead", "markAllNotificationsRead", undefined],
    ["remove", "deleteNotification", "notification-1"],
  ])("propagates the API error from %s", async (action, request, id) => {
    const { provider, api } = await load();
    const error = Object.assign(new Error("Notification request failed"), {
      status: 500,
      data: { message: "Notification request failed" },
      path: "/api/notifications",
    });
    api[request].mockRejectedValue(error);

    await expect(provider[action](id)).rejects.toBe(error);
  });

  it("reads the list through the shared API module", async () => {
    const { provider, api } = await load();

    await provider.list();

    expect(api.getNotifications).toHaveBeenCalledTimes(1);
  });

  it("accepts overrides, which is how a caller substitutes a double", async () => {
    const { createApiNotificationProvider } = await import("./notificationApiProvider");
    const list = vi.fn().mockResolvedValue({ items: [] });
    await createApiNotificationProvider({ list, persists: true }).list();

    expect(list).toHaveBeenCalledTimes(1);
  });
});
