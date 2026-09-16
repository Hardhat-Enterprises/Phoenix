import { useMemo } from "react";
import NotificationList from "./NotificationList";
import useNotificationFeed from "./useNotificationFeed";
import { createApiNotificationProvider } from "../services/notificationApiProvider";
import { createMockNotificationProvider } from "../services/mockNotificationProvider";
import { NOTIFICATION_USE_MOCK } from "../config/environment";

// ---------------------------------------------------------------------------
// Wiring only: choose a provider, hand its data and actions to the list.
//
// Everything the panel renders lives in NotificationList, which takes records
// and callbacks and imports no API module. This file is the only place that
// decides where those records come from, so a caller can pass its own provider
// and get the same panel against any data source.
// ---------------------------------------------------------------------------

export default function NotificationPanel({
  onClose,
  onSignIn,
  // Injected by the host: the result of whatever search and filter controls sit
  // above the panel. Absent means no filtering.
  filters = null,
  // Escape hatch for the component showcase, tests, and demos.
  provider: injectedProvider = null,
}) {
  const provider = useMemo(
    () =>
      injectedProvider ||
      (NOTIFICATION_USE_MOCK
        ? createMockNotificationProvider()
        : createApiNotificationProvider()),
    [injectedProvider],
  );

  const { notifications, status, error, actions, refresh, retry, provider: providerInfo } =
    useNotificationFeed({ provider });

  return (
    <NotificationList
      notifications={notifications}
      status={status}
      error={error}
      provider={providerInfo}
      actions={actions}
      filters={filters}
      onRefresh={refresh}
      onRetry={retry}
      onSignIn={onSignIn}
      onClose={onClose}
    />
  );
}
