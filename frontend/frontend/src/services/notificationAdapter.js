// ---------------------------------------------------------------------------
// The single place where a backend notification record becomes the shape the
// notification panel renders. Field names are not fixed by the gateway
// contract yet, so every field is read from a list of accepted aliases here
// and nowhere else. If the backend settles on different names, change this
// file only.
// ---------------------------------------------------------------------------

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const firstValue = (source, keys) => {
  for (const key of keys) {
    if (hasValue(source?.[key])) {
      return source[key];
    }
  }

  return "";
};

const ID_KEYS = [
  "id",
  "notification_id",
  "notificationId",
  "_id",
  "uuid",
  "alert_id",
  "alertId",
];

const TITLE_KEYS = ["title", "subject", "heading", "name", "event_type", "type"];

const MESSAGE_KEYS = [
  "message",
  "description",
  "body",
  "text",
  "detail",
  "details",
  "content",
  "summary",
];

const SEVERITY_KEYS = [
  "severity",
  "level",
  "alert_level",
  "alertLevel",
  "priority",
  "urgency",
];

const RECIPIENT_KEYS = ["recipient", "recipient_email", "recipientEmail", "to"];

const CREATED_KEYS = [
  "created_at",
  "createdAt",
  "timestamp",
  "occurred_at",
  "occurredAt",
  "sent_at",
  "sentAt",
  "time",
  "date",
];

const SEVERITY_LABELS = {
  critical: "Critical",
  emergency: "Critical",
  fatal: "Critical",
  sev1: "Critical",
  p1: "Critical",
  high: "High",
  severe: "High",
  error: "High",
  danger: "High",
  sev2: "High",
  p2: "High",
  medium: "Medium",
  moderate: "Medium",
  warning: "Medium",
  warn: "Medium",
  watch: "Medium",
  sev3: "Medium",
  p3: "Medium",
  low: "Low",
  minor: "Low",
  sev4: "Low",
  p4: "Low",
  info: "Info",
  informational: "Info",
  notice: "Info",
  advisory: "Info",
};

// Numeric severities arrive either as 0-1 or as 0-100 depending on the
// producer, so normalise to 0-1 before banding.
const severityFromNumber = (number) => {
  const scaled = number > 1 ? number / 100 : number;

  if (scaled >= 0.8) return "Critical";
  if (scaled >= 0.6) return "High";
  if (scaled >= 0.4) return "Medium";
  if (scaled > 0) return "Low";

  return "Info";
};

const readSeverity = (raw) => {
  const value = firstValue(raw, SEVERITY_KEYS);

  if (!hasValue(value)) {
    return { label: "", tone: "unknown" };
  }

  const number = Number(value);

  if (Number.isFinite(number) && String(value).trim() !== "") {
    const label = severityFromNumber(number);
    return { label, tone: label.toLowerCase() };
  }

  const normalized = String(value).trim().toLowerCase().replace(/[\s_-]/g, "");
  const label = SEVERITY_LABELS[normalized];

  if (label) {
    return { label, tone: label.toLowerCase() };
  }

  // An unrecognised severity is still worth showing verbatim.
  return { label: String(value).trim(), tone: "unknown" };
};

const READ_TRUE_STATUSES = ["read", "seen", "acknowledged", "dismissed"];
const READ_FALSE_STATUSES = ["unread", "new", "pending", "unseen"];

// Returns true, false, or null when the backend does not report read state.
const readReadState = (raw) => {
  const flags = [raw?.read, raw?.is_read, raw?.isRead, raw?.seen, raw?.is_seen];

  for (const flag of flags) {
    if (typeof flag === "boolean") {
      return flag;
    }

    if (flag === "true" || flag === 1) return true;
    if (flag === "false" || flag === 0) return false;
  }

  if (hasValue(raw?.read_at) || hasValue(raw?.readAt) || hasValue(raw?.seen_at)) {
    return true;
  }

  const status = String(raw?.status ?? raw?.state ?? "").trim().toLowerCase();

  if (READ_TRUE_STATUSES.includes(status)) return true;
  if (READ_FALSE_STATUSES.includes(status)) return false;

  return null;
};

const readCreatedAt = (raw) => {
  const value = firstValue(raw, CREATED_KEYS);

  if (!hasValue(value)) {
    return { iso: "", date: null };
  }

  // Epoch values arrive as seconds or milliseconds.
  const number = Number(value);
  const date =
    Number.isFinite(number) && String(value).trim() !== ""
      ? new Date(number < 1e12 ? number * 1000 : number)
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { iso: "", date: null, raw: String(value) };
  }

  return { iso: date.toISOString(), date };
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

// A month name instead of a numeric month, so the same string cannot be read as
// either day/month or month/day depending on the reader's locale.
const DATE_FORMAT = { day: "numeric", month: "short", year: "numeric" };
const DATE_TIME_FORMAT = { ...DATE_FORMAT, hour: "2-digit", minute: "2-digit" };

// Clocks between the browser and the producer disagree by a little, so a
// timestamp slightly in the future is treated as "now" rather than as pending.
const CLOCK_SKEW_ALLOWANCE = MINUTE;

export const formatRelativeTime = (date, now = new Date()) => {
  if (!date) {
    return "";
  }

  const difference = now.getTime() - date.getTime();

  if (difference < -CLOCK_SKEW_ALLOWANCE) {
    return `Scheduled for ${date.toLocaleString(undefined, DATE_TIME_FORMAT)}`;
  }

  if (difference < MINUTE) return "Just now";

  if (difference < HOUR) {
    const minutes = Math.floor(difference / MINUTE);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (difference < DAY) {
    const hours = Math.floor(difference / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (difference < WEEK) {
    const days = Math.floor(difference / DAY);
    return days === 1 ? "Yesterday" : `${days} days ago`;
  }

  // Past a week a relative label stops being informative, so show the date.
  return date.toLocaleDateString(undefined, DATE_FORMAT);
};

export const formatAbsoluteTime = (date) =>
  date ? date.toLocaleString(undefined, DATE_TIME_FORMAT) : "";

// Falls back to a content-derived key so IDs stay stable across refetches when
// the backend omits one. Index is the last resort.
const readId = (raw, index, title, createdIso) => {
  const id = firstValue(raw, ID_KEYS);

  if (hasValue(id)) {
    return String(id);
  }

  if (createdIso || title) {
    return `notification-${createdIso || "no-date"}-${title || "untitled"}`;
  }

  return `notification-${index}`;
};

export const adaptNotification = (raw, index = 0) => {
  const source = raw && typeof raw === "object" ? raw : {};
  const message = String(firstValue(source, MESSAGE_KEYS) || "");
  const rawTitle = String(firstValue(source, TITLE_KEYS) || "");
  const severity = readSeverity(source);
  const created = readCreatedAt(source);

  // A record with only a message still needs a heading, so borrow the start of
  // the message rather than inventing a title.
  const title =
    rawTitle ||
    (message.length > 60 ? `${message.slice(0, 60).trimEnd()}...` : message) ||
    "Notification";

  const read = readReadState(source);

  return {
    id: readId(source, index, rawTitle, created.iso),
    title,
    // Avoid repeating the message when it was promoted into the title.
    message: !rawTitle && message === title ? "" : message,
    recipient: String(firstValue(source, RECIPIENT_KEYS) || ""),
    severity: severity.label,
    severityTone: severity.tone,
    createdAtIso: created.iso,
    createdAtDate: created.date,
    // The relative label is deliberately not stored here: it would freeze at
    // the moment of adaptation and still read "Just now" an hour later. The
    // panel formats createdAtDate at render time instead.
    createdAtRaw: created.raw || "",
    createdAtExact: formatAbsoluteTime(created.date),
    read: read === true,
    hasReadState: read !== null,
    // Position in the backend response, used as the ordering tie-break.
    sourceIndex: index,
  };
};

// Newest first, with an explicit tie-break so the order never depends on the
// engine's sort stability and never changes between two identical responses.
export const sortNotifications = (items = []) =>
  [...items].sort((a, b) => {
    const aTime = a.createdAtDate ? a.createdAtDate.getTime() : null;
    const bTime = b.createdAtDate ? b.createdAtDate.getTime() : null;

    if (aTime !== null && bTime !== null && aTime !== bTime) {
      return bTime - aTime;
    }

    // A dated record outranks an undated one, so undated records gather at the
    // bottom instead of drifting through the list.
    if (aTime !== null && bTime === null) return -1;
    if (aTime === null && bTime !== null) return 1;

    // Same instant, or neither dated: keep the order the backend sent. Every
    // record is undated under the current contract, so this is the live path.
    return a.sourceIndex - b.sourceIndex;
  });

export const adaptNotifications = (items = []) =>
  sortNotifications(
    (Array.isArray(items) ? items : []).map(adaptNotification),
  );
