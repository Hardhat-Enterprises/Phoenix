// ---------------------------------------------------------------------------
// The list transformations the panel performs, as pure functions over adapted
// notification records. Keeping them here means the optimistic path and its
// rollback can be reasoned about — and tested — without a DOM, and without the
// API layer.
//
// Every function returns a new array and never mutates its input: rollback
// depends on the caller still holding the pre-mutation list.
// ---------------------------------------------------------------------------

const sameId = (item, id) => String(item?.id) === String(id);

// Only records that report a read state can be unread. A backend that omits
// read state must not make every notification look unread.
export const isUnread = (item) => Boolean(item?.hasReadState) && !item.read;

export const countUnread = (items = []) => items.filter(isUnread).length;

export const findById = (items = [], id) =>
  items.find((item) => sameId(item, id)) || null;

export const markReadInList = (items = [], id) =>
  items.map((item) => (sameId(item, id) && isUnread(item) ? { ...item, read: true } : item));

export const markUnreadInList = (items = [], id) =>
  items.map((item) =>
    sameId(item, id) && item.hasReadState && item.read
      ? { ...item, read: false }
      : item,
  );

export const markAllReadInList = (items = []) =>
  items.map((item) => (isUnread(item) ? { ...item, read: true } : item));

export const removeFromList = (items = [], id) =>
  items.filter((item) => !sameId(item, id));

// Mark-all-read is pointless — and must be disabled — when nothing is unread.
export const hasMarkAllReadWork = (items = []) => items.some(isUnread);

const textOf = (item) =>
  [
    item?.title,
    item?.message,
    item?.eventType,
    item?.severity,
    item?.recipient,
    ...(item?.metadata?.entries || []).map(
      (entry) => `${entry.label} ${entry.value}`,
    ),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const matchesQuery = (item, query) => {
  const needle = String(query || "").trim().toLowerCase();

  return needle ? textOf(item).includes(needle) : true;
};

const matchesOneOf = (value, allowed) => {
  if (!allowed || (Array.isArray(allowed) && allowed.length === 0)) {
    return true;
  }

  const list = (Array.isArray(allowed) ? allowed : [allowed])
    .map((entry) => String(entry).trim().toLowerCase())
    .filter(Boolean);

  if (list.length === 0) {
    return true;
  }

  return list.includes(String(value || "").trim().toLowerCase());
};

// Filters are injected by the host (the search and filter controls are someone
// else's component), so an absent or partial filter object means "no filter".
export const filterNotifications = (items = [], filters = null) => {
  if (!filters) {
    return items;
  }

  const { query, unreadOnly, severity, eventType } = filters;

  return items.filter(
    (item) =>
      matchesQuery(item, query) &&
      (!unreadOnly || isUnread(item)) &&
      matchesOneOf(item?.severity, severity) &&
      matchesOneOf(item?.eventType, eventType),
  );
};

export const hasActiveFilters = (filters = null) => {
  if (!filters) {
    return false;
  }

  const { query, unreadOnly, severity, eventType } = filters;
  const hasList = (value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value);

  return (
    Boolean(String(query || "").trim()) ||
    Boolean(unreadOnly) ||
    hasList(severity) ||
    hasList(eventType)
  );
};

export const LIST_VIEWS = Object.freeze({
  INITIAL_LOADING: "initial-loading",
  BLOCKING_ERROR: "blocking-error",
  EMPTY: "empty",
  NO_MATCHES: "no-matches",
  ITEMS: "items",
});

// The single decision about what occupies the body of the panel. "Loaded
// nothing" and "filtered everything out" are different answers and need
// different wording; a failed refresh that still has a last good list is shown
// as items plus an inline warning, never as an error page.
export const deriveListView = ({
  status,
  items = [],
  visibleItems = items,
  filters = null,
}) => {
  const hasItems = items.length > 0;

  if (status === "loading" && !hasItems) {
    return LIST_VIEWS.INITIAL_LOADING;
  }

  if (status === "error" && !hasItems) {
    return LIST_VIEWS.BLOCKING_ERROR;
  }

  if (!hasItems) {
    return LIST_VIEWS.EMPTY;
  }

  if (visibleItems.length === 0) {
    return hasActiveFilters(filters) ? LIST_VIEWS.NO_MATCHES : LIST_VIEWS.EMPTY;
  }

  return LIST_VIEWS.ITEMS;
};

// A pending mutation is keyed by what it does and to which record, so two
// different records can be in flight at once while a second click on the same
// record is refused.
export const mutationKey = (action, id) =>
  id === undefined || id === null ? action : `${action}:${id}`;
