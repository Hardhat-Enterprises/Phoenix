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

// A record the backend reported as read. Distinct from "not unread", because a
// record with no read state at all is neither.
export const isRead = (item) => Boolean(item?.hasReadState) && Boolean(item.read);

// read is tri-state: null or undefined means "any", true means read, false
// means unread. unreadOnly is kept as the older spelling of read: false.
const matchesReadState = (item, read, unreadOnly) => {
  if (unreadOnly) {
    return isUnread(item);
  }

  if (read === true) return isRead(item);
  if (read === false) return isUnread(item);

  return true;
};

// Filters are injected by the host, so an absent or partial filter object means
// "no filter".
export const filterNotifications = (items = [], filters = null) => {
  if (!filters) {
    return items;
  }

  const { query, read, unreadOnly, severity, eventType } = filters;

  return items.filter(
    (item) =>
      matchesQuery(item, query) &&
      matchesReadState(item, read, unreadOnly) &&
      matchesOneOf(item?.severity, severity) &&
      matchesOneOf(item?.eventType, eventType),
  );
};

export const hasActiveFilters = (filters = null) => {
  if (!filters) {
    return false;
  }

  const { query, read, unreadOnly, severity, eventType } = filters;
  const hasList = (value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value);

  return (
    Boolean(String(query || "").trim()) ||
    Boolean(unreadOnly) ||
    read === true ||
    read === false ||
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

// Clamps a requested page to what the filtered list can actually show, so a
// delete that empties the last page cannot leave the reader on a blank one.
export const derivePage = ({ page = 1, limit = 10, total = 0 }) => {
  const safeLimit = Math.max(1, Number(limit) || 1);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const startIndex = (currentPage - 1) * safeLimit;

  return {
    page: currentPage,
    limit: safeLimit,
    totalPages,
    startIndex,
    endIndex: Math.min(startIndex + safeLimit, total),
    total,
  };
};
