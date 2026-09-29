import { useMemo } from "react";
import NotificationList from "./NotificationList";
import NotificationControls from "./NotificationControls";
import useNotificationFeed from "./useNotificationFeed";
import useNotificationQueryState from "./useNotificationQueryState";
import { createApiNotificationProvider } from "../services/notificationApiProvider";
import { createMockNotificationProvider } from "../services/mockNotificationProvider";
import { adaptNotifications } from "../services/notificationAdapter";
import { NOTIFICATION_USE_MOCK } from "../config/environment";

// ---------------------------------------------------------------------------
// Wiring only: choose a provider, own the filter state, hand both to the list.
//
// Everything the panel renders lives in NotificationList, which takes records
// and callbacks and imports no API module. Search, read filter and page size
// live in useNotificationQueryState, which keeps them in the URL. This file
// composes the three, so a caller can pass its own provider or its own filters
// and get the same panel against any data source.
// ---------------------------------------------------------------------------

// Search is filtered in the browser, over the notifications already loaded. The
// gateway accepts no search parameter, so the box is kept off until it does
// rather than implying it searches everything on the server.
export const NOTIFICATION_SEARCH_ENABLED = false;

export default function NotificationPanel({
  onClose,
  onSignIn,
  // Supplying filters takes over from the panel's own URL-backed controls,
  // which is how a host that already has search controls drives the list.
  filters: injectedFilters = null,
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

  const adapt = useMemo(
    () => (records) => {
      const adapted = adaptNotifications(records);
      if (!provider.persists) return adapted;

      return adapted.map((item) => {
        const rawId = records[item.sourceIndex]?.id;
        const validId =
          (typeof rawId === "string" && rawId.trim() !== "") ||
          (typeof rawId === "number" && Number.isFinite(rawId));

        return {
          ...item,
          hasServerId: validId && String(rawId) === item.id,
        };
      });
    },
    [provider.persists],
  );

  const {
    notifications,
    status,
    error,
    actions,
    refresh,
    retry,
    provider: providerInfo,
  } = useNotificationFeed({ provider, adapt });

  const queryState = useNotificationQueryState();

  const ownFilters = useMemo(
    () => ({ query: queryState.search, read: queryState.read }),
    [queryState.search, queryState.read],
  );

  const filters = injectedFilters ?? ownFilters;

  return (
    <NotificationList
      notifications={notifications}
      status={status}
      error={error}
      provider={providerInfo}
      requireServerId={providerInfo.persists}
      actions={actions}
      filters={filters}
      pagination={{
        page: queryState.page,
        limit: queryState.limit,
        onPageChange: queryState.changePage,
      }}
      controls={
        <NotificationControls
          searchEnabled={NOTIFICATION_SEARCH_ENABLED}
          searchValue={queryState.searchInput}
          onSearchChange={queryState.changeSearch}
          read={queryState.read}
          onReadChange={queryState.changeRead}
          limit={queryState.limit}
          onLimitChange={queryState.changeLimit}
        />
      }
      onRefresh={refresh}
      onRetry={retry}
      onSignIn={onSignIn}
      onClose={onClose}
    />
  );
}
