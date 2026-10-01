// ---------------------------------------------------------------------------
// A notification provider backed by nothing but memory.
//
// It exists so the panel can be built, demonstrated and tested before the real
// API adapter lands, and it deliberately imports no part of the shared API
// layer. Its records are raw — the same messy shapes the gateway is expected to
// send — so running against the mock exercises the adapter too.
//
// persists is false and must stay false: every action here changes this tab
// only, and the panel words its confirmations from that flag.
// ---------------------------------------------------------------------------

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Seeded relative to load time so the relative timestamps stay meaningful
// however long after this file was written the panel is opened.
export const createMockNotifications = (now = Date.now()) => [
  {
    id: "mock-1",
    title: "Ransomware signature matched",
    body: "Host db-prod-1 matched a known LockBit loader signature.",
    event_type: "threat_detected",
    severity: "critical",
    created_at: now - 4 * MINUTE,
    read: false,
    recipient: "soc@phoenix.local",
    // The contract's own shape: metadata as a JSON string.
    metadata: '{"source_ip":"10.0.0.41","host":"db-prod-1","confidence":0.94,"cve":"CVE-2024-21412"}',
  },
  {
    id: "mock-2",
    title: "Unusual sign-in location",
    body: "Sign-in for j.patel from an unrecognised country.",
    event_type: "anomaly_detected",
    severity: "high",
    created_at: now - 3 * HOUR,
    read: false,
    // Already decoded, which is what a gateway that parses for us would send.
    metadata: {
      user: "j.patel",
      country: "unlisted",
      riskScore: 72,
      previousLogin: "Melbourne, AU",
    },
  },
  {
    id: "mock-3",
    title: "Ingestion backlog cleared",
    body: "The ingestion queue returned to normal depth.",
    event_type: "SYSTEM.MAINTENANCE",
    severity: "info",
    created_at: now - 26 * HOUR,
    read: true,
    // Truncated by a producer mid-write: must render as unreadable, not crash.
    metadata: '{"queue":"ingest-core","depth":',
  },
  {
    id: "mock-4",
    subject: "Weekly risk report ready",
    // No metadata at all.
    metadata: null,
    type: "report_ready",
    level: 2,
    timestamp: now - 3 * DAY,
    is_read: true,
  },
  {
    id: "mock-5",
    message: "Sensor 14 stopped reporting.",
    event_type: "sensor_offline",
    priority: 0.55,
    // An unparseable timestamp, which must fall back rather than blank out.
    created_at: "not a real date",
    status: "unread",
    metadata: "",
  },
];

const delay = (ms) =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

const failure = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// failOn lets a caller force any operation to reject, which is how the
// rollback, mutation-error and unauthorised states are demonstrated without a
// backend. Values may be `true` or an { message, status } object.
const rejectionFor = (failOn, operation) => {
  const configured = failOn?.[operation];

  if (!configured) {
    return null;
  }

  if (configured === true) {
    return failure(
      "The mock provider was asked to fail this operation.",
      500,
    );
  }

  return failure(
    configured.message || "The mock provider was asked to fail this operation.",
    configured.status || 500,
  );
};

export const createMockNotificationProvider = ({
  seed,
  latencyMs = 0,
  failOn = null,
  now = Date.now(),
} = {}) => {
  let records = (seed || createMockNotifications(now)).map((record) => ({
    ...record,
  }));

  const run = async (operation, mutate) => {
    await delay(latencyMs);

    const rejection = rejectionFor(failOn, operation);

    if (rejection) {
      throw rejection;
    }

    return mutate ? mutate() : undefined;
  };

  const indexOf = (id) =>
    records.findIndex((record) => String(record.id) === String(id));

  return {
    id: "mock",
    label: "Mock notification data",
    // Nothing here reaches a server, and the UI says so because of this flag.
    persists: false,
    isMock: true,

    list: () => run("list", () => ({ items: records.map((r) => ({ ...r })) })),

    markRead: (id) =>
      run("markRead", () => {
        const index = indexOf(id);

        if (index === -1) {
          throw failure("That notification no longer exists.", 404);
        }

        records[index] = { ...records[index], read: true, status: "read" };
        return { ...records[index] };
      }),

    markAllRead: () =>
      run("markAllRead", () => {
        records = records.map((record) => ({
          ...record,
          read: true,
          status: "read",
        }));

        return { updated: records.length };
      }),

    remove: (id) =>
      run("remove", () => {
        const index = indexOf(id);

        if (index === -1) {
          throw failure("That notification no longer exists.", 404);
        }

        records = records.filter((_, position) => position !== index);
        return { deleted: String(id) };
      }),
  };
};
