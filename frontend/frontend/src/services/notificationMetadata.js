// ---------------------------------------------------------------------------
// Notification metadata is the one field of the proposed contract whose shape
// the frontend cannot rely on. Producers send it as a JSON string, as an
// already-decoded object, as an empty string, as null, and — when a producer
// truncates or double-encodes it — as a string that is not valid JSON at all.
//
// Everything here is total: no input throws, and no input can stop the list or
// the details view from rendering. A record whose metadata cannot be structured
// still renders, with the raw text shown verbatim and labelled as unreadable.
// ---------------------------------------------------------------------------

// Keys the metadata object may arrive under. "details" and "data" are
// deliberately absent: the adapter already reads those as the message body, and
// claiming them here would print the message twice.
export const METADATA_KEYS = [
  "metadata",
  "meta",
  "attributes",
  "context",
  "properties",
  "payload",
  "extra",
];

// A malicious or broken producer can send an object with thousands of keys.
// The panel shows a bounded number and reports how many it held back.
const MAX_ENTRIES = 20;
const MAX_TEXT_LENGTH = 400;

export const METADATA_STATUS = Object.freeze({
  EMPTY: "empty",
  OBJECT: "object",
  LIST: "list",
  SCALAR: "scalar",
  TEXT: "text",
  MALFORMED: "malformed",
});

const truncate = (text, limit = MAX_TEXT_LENGTH) =>
  text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}...` : text;

// Acronyms that read as noise when title-cased ("Ip" for "ip").
const ACRONYMS = new Set([
  "id",
  "ip",
  "url",
  "uri",
  "api",
  "cve",
  "cvss",
  "dns",
  "http",
  "https",
  "os",
  "cpu",
  "gpu",
  "ttl",
  "sha",
  "md5",
  "mfa",
  "sla",
  "uuid",
  "asn",
  "ssl",
  "tls",
  "vpn",
]);

// "source_ip" / "sourceIp" / "source-ip" all become "Source IP".
export const labelFromKey = (key) => {
  const words = String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_\-.]+/)
    .filter(Boolean);

  if (words.length === 0) {
    return String(key);
  }

  return words
    .map((word) => {
      const lower = word.toLowerCase();

      if (ACRONYMS.has(lower)) {
        return lower.toUpperCase();
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
};

// JSON.stringify throws on circular structures and on BigInt, and both reach us
// from real producers, so every hostile case is replaced rather than thrown.
const safeStringify = (value) => {
  const seen = new WeakSet();

  try {
    return (
      JSON.stringify(value, (_key, inner) => {
        if (typeof inner === "bigint") return `${inner}`;
        if (typeof inner === "function") return "[function]";
        if (typeof inner === "symbol") return inner.toString();

        if (inner && typeof inner === "object") {
          if (seen.has(inner)) return "[circular]";
          seen.add(inner);
        }

        return inner;
      }) || ""
    );
  } catch {
    return "";
  }
};

const isPlainRecord = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

// Returns "" for anything with nothing worth showing, which is how a caller
// skips empty, null and unrenderable values without special-casing each one.
export const formatMetadataValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return truncate(value.trim());
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  if (typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  if (typeof value === "function" || typeof value === "symbol") {
    return "";
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }

  if (Array.isArray(value)) {
    const parts = value.map(formatMetadataValue).filter(Boolean);
    return parts.length === 0 ? "" : truncate(parts.join(", "));
  }

  const serialised = safeStringify(value);

  if (!serialised || serialised === "{}" || serialised === "null") {
    return "";
  }

  return truncate(serialised);
};

const entriesFromRecord = (record) => {
  let keys = [];

  try {
    keys = Object.keys(record);
  } catch {
    // A Proxy can throw on enumeration. An unreadable object is an empty one.
    return { entries: [], hiddenCount: 0 };
  }

  const entries = [];
  let hiddenCount = 0;

  for (const key of keys) {
    let value = "";

    try {
      value = formatMetadataValue(record[key]);
    } catch {
      // A getter that throws must not take the panel down with it.
      value = "";
    }

    if (!value) {
      continue;
    }

    if (entries.length >= MAX_ENTRIES) {
      hiddenCount += 1;
      continue;
    }

    entries.push({ key: String(key), label: labelFromKey(key), value });
  }

  return { entries, hiddenCount };
};

const entriesFromList = (list) => {
  const entries = [];
  let hiddenCount = 0;

  list.forEach((item, index) => {
    const value = formatMetadataValue(item);

    if (!value) {
      return;
    }

    if (entries.length >= MAX_ENTRIES) {
      hiddenCount += 1;
      return;
    }

    entries.push({
      key: String(index),
      label: `Item ${index + 1}`,
      value,
    });
  });

  return { entries, hiddenCount };
};

const result = ({
  status,
  entries = [],
  hiddenCount = 0,
  raw = "",
  malformed = false,
}) => ({
  status,
  entries,
  hiddenCount,
  raw,
  malformed,
  isEmpty: entries.length === 0 && !raw,
});

const EMPTY_METADATA = Object.freeze(result({ status: METADATA_STATUS.EMPTY }));

const fromDecodedValue = (value, { fallbackRaw = "" } = {}) => {
  if (Array.isArray(value)) {
    const { entries, hiddenCount } = entriesFromList(value);

    return entries.length === 0
      ? EMPTY_METADATA
      : result({ status: METADATA_STATUS.LIST, entries, hiddenCount });
  }

  if (isPlainRecord(value)) {
    const { entries, hiddenCount } = entriesFromRecord(value);

    return entries.length === 0
      ? EMPTY_METADATA
      : result({ status: METADATA_STATUS.OBJECT, entries, hiddenCount });
  }

  // A JSON scalar ("42", "true", a quoted string) is still worth showing, but
  // it has no key of its own to label.
  const scalar = formatMetadataValue(value);

  if (!scalar) {
    return EMPTY_METADATA;
  }

  return result({
    status: METADATA_STATUS.SCALAR,
    entries: [{ key: "value", label: "Value", value: scalar }],
    raw: fallbackRaw,
  });
};

// Accepts an object, a JSON string, empty, null, or something malformed, and
// always returns the same shape.
export const parseNotificationMetadata = (value) => {
  if (value === null || value === undefined) {
    return EMPTY_METADATA;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return EMPTY_METADATA;
    }

    let decoded;

    try {
      decoded = JSON.parse(trimmed);
    } catch {
      // A string that opens like JSON was meant to be JSON, so report it as
      // broken. Anything else is plain prose and is shown as written.
      const looksLikeJson = /^[[{]/.test(trimmed);

      return result({
        status: looksLikeJson
          ? METADATA_STATUS.MALFORMED
          : METADATA_STATUS.TEXT,
        entries: looksLikeJson
          ? []
          : [{ key: "value", label: "Value", value: truncate(trimmed) }],
        raw: truncate(trimmed),
        malformed: looksLikeJson,
      });
    }

    return fromDecodedValue(decoded, { fallbackRaw: truncate(trimmed) });
  }

  if (typeof value === "object" || typeof value === "number" || typeof value === "boolean") {
    return fromDecodedValue(value);
  }

  return EMPTY_METADATA;
};

// Picks the first metadata-shaped field a record carries and parses it.
export const readNotificationMetadata = (source) => {
  if (!source || typeof source !== "object") {
    return EMPTY_METADATA;
  }

  for (const key of METADATA_KEYS) {
    if (source[key] === undefined || source[key] === null) {
      continue;
    }

    const parsed = parseNotificationMetadata(source[key]);

    // An unreadable value still counts as "the record had metadata": saying so
    // is more useful than silently falling through to the next alias.
    if (!parsed.isEmpty) {
      return parsed;
    }
  }

  return EMPTY_METADATA;
};

export const EMPTY_NOTIFICATION_METADATA = EMPTY_METADATA;
