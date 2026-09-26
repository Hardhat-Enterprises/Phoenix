// ---------------------------------------------------------------------------
// The notification provider backed by the real API gateway.
//
// This is the only file that knows both the provider contract and the shared
// API module, which is what keeps the list component free of either.
//
// Successful mutations are confirmed by the gateway before this provider
// reports them as persisted.
// ---------------------------------------------------------------------------

import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./phoenixApi";

export const createApiNotificationProvider = (overrides = {}) => ({
  id: "api",
  label: "Phoenix API gateway",
  persists: true,
  isMock: false,

  list: () => getNotifications(),

  markRead: async (id) => {
    const response = await markNotificationRead(id);
    return { persisted: true, notification: response.data.notification };
  },
  markAllRead: async () => {
    const response = await markAllNotificationsRead();
    return { persisted: true, updatedCount: response.data.updatedCount };
  },
  remove: async (id) => {
    await deleteNotification(id);
    return { persisted: true, notificationId: id };
  },

  ...overrides,
});

export default createApiNotificationProvider;
