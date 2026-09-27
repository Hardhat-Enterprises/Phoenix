import { describe, expect, it, vi } from "vitest";

// The gateway's mutation endpoints do not exist yet, so this asserts the thing
// that matters while that is true: nothing is sent, and nothing claims to have
// been saved.
vi.mock("./phoenixApi", () => ({
  NOTIFICATION_MUTATIONS_SUPPORTED: false,
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
  it("does not claim to persist while the endpoints are missing", async () => {
    const { provider } = await load();

    expect(provider.persists).toBe(false);
    expect(provider.isMock).toBe(false);
  });

  it("resolves each action without sending a request", async () => {
    const { provider, api } = await load();

    await expect(provider.markRead("1")).resolves.toEqual({ persisted: false });
    await expect(provider.markAllRead()).resolves.toEqual({ persisted: false });
    await expect(provider.remove("1")).resolves.toEqual({ persisted: false });

    expect(api.markNotificationRead).not.toHaveBeenCalled();
    expect(api.markAllNotificationsRead).not.toHaveBeenCalled();
    expect(api.deleteNotification).not.toHaveBeenCalled();
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
