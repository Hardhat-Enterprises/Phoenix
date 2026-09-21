// ---------------------------------------------------------------------------
// The notification provider backed by the real API gateway.
//
// This is the only file that knows both the provider contract and the shared
// API module, which is what keeps the list component free of either.
//
// The gateway exposes GET /api/notifications and nothing else yet. Until it
// accepts mutations, each action here resolves without sending anything and
// `persists` stays false, so the panel keeps working locally and keeps saying
// that it did. When the endpoints land, NOTIFICATION_MUTATIONS_SUPPORTED flips
// to true and both the requests and the wording follow from that one change.
// ---------------------------------------------------------------------------

import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_MUTATIONS_SUPPORTED,
} from "./phoenixApi";

const localOnly = () => Promise.resolve({ persisted: false });

const whenSupported = (request) =>
  NOTIFICATION_MUTATIONS_SUPPORTED && typeof request === "function"
    ? request
    : localOnly;

export const createApiNotificationProvider = (overrides = {}) => ({
  id: "api",
  label: "Phoenix API gateway",
  persists: Boolean(NOTIFICATION_MUTATIONS_SUPPORTED),
  isMock: false,

  list: () => getNotifications(),

  markRead: whenSupported(markNotificationRead),
  markAllRead: whenSupported(markAllNotificationsRead),
  remove: whenSupported(deleteNotification),

  ...overrides,
});

export default createApiNotificationProvider;
