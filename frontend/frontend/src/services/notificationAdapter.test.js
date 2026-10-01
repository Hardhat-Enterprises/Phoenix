import { describe, expect, it } from "vitest";
import {
  adaptNotification,
  adaptNotifications,
  formatRelativeTime,
} from "./notificationAdapter";

describe("adaptNotification", () => {
  it("presents title, message, event type, timestamp and read state", () => {
    const record = adaptNotification({
      id: 7,
      title: "Ransomware signature matched",
      body: "Host db-prod-1 matched a known loader.",
      event_type: "threat_detected",
      severity: "critical",
      created_at: "2026-09-14T02:00:00.000Z",
      read: false,
    });

    expect(record).toMatchObject({
      id: "7",
      title: "Ransomware signature matched",
      message: "Host db-prod-1 matched a known loader.",
      eventType: "Threat Detected",
      severity: "Critical",
      createdAtIso: "2026-09-14T02:00:00.000Z",
      read: false,
      hasReadState: true,
    });
    expect(record.createdAtExact).not.toBe("");
  });

  it("keeps an event type that already reads as prose exactly as sent", () => {
    expect(adaptNotification({ eventName: "Anomaly detected by model" }).eventType).toBe(
      "Anomaly detected by model",
    );
  });

  it("words a dotted machine token", () => {
    expect(adaptNotification({ event_type: "SYSTEM.MAINTENANCE" }).eventType).toBe(
      "System Maintenance",
    );
  });

  it("exposes a valid timestamp in both human and machine-readable form", () => {
    const record = adaptNotification({ created_at: 1757808000000 });

    expect(record.createdAtIso).toBe(new Date(1757808000000).toISOString());
    expect(record.createdAtDate).toBeInstanceOf(Date);
  });

  it("falls back safely for an unparseable timestamp", () => {
    const record = adaptNotification({ created_at: "not a real date" });

    expect(record.createdAtIso).toBe("");
    expect(record.createdAtDate).toBeNull();
    // The raw value is kept so the panel can show what the backend sent.
    expect(record.createdAtRaw).toBe("not a real date");
  });

  it("reports no read state when the backend does not send one", () => {
    expect(adaptNotification({ title: "No read flag" })).toMatchObject({
      read: false,
      hasReadState: false,
    });
  });

  it("attaches parsed metadata, whatever shape it arrived in", () => {
    expect(adaptNotification({ metadata: '{"host":"db-1"}' }).metadata.entries).toEqual([
      { key: "host", label: "Host", value: "db-1" },
    ]);
    expect(adaptNotification({ metadata: { host: "db-1" } }).metadata.entries).toHaveLength(1);
    expect(adaptNotification({ metadata: null }).metadata.isEmpty).toBe(true);
    expect(adaptNotification({ metadata: "{broken" }).metadata.malformed).toBe(true);
  });

  it("never throws on a record that is not an object", () => {
    expect(() => adaptNotification(null)).not.toThrow();
    expect(() => adaptNotification("nonsense")).not.toThrow();
    expect(adaptNotification(undefined, 3).id).toBe("notification-3");
  });
});

describe("adaptNotifications ordering", () => {
  it("sorts newest first", () => {
    const items = adaptNotifications([
      { id: "old", created_at: "2026-09-01T00:00:00.000Z" },
      { id: "new", created_at: "2026-09-13T00:00:00.000Z" },
      { id: "middle", created_at: "2026-09-07T00:00:00.000Z" },
    ]);

    expect(items.map((item) => item.id)).toEqual(["new", "middle", "old"]);
  });

  it("keeps undated records in backend order, below the dated ones", () => {
    const items = adaptNotifications([
      { id: "a" },
      { id: "b" },
      { id: "dated", created_at: "2026-09-01T00:00:00.000Z" },
      { id: "c" },
    ]);

    expect(items.map((item) => item.id)).toEqual(["dated", "a", "b", "c"]);
  });

  it("is stable: the same response always yields the same order", () => {
    const response = [
      { id: "a", created_at: "2026-09-01T00:00:00.000Z" },
      { id: "b", created_at: "2026-09-01T00:00:00.000Z" },
      { id: "c", created_at: "2026-09-01T00:00:00.000Z" },
    ];

    const first = adaptNotifications(response).map((item) => item.id);
    const second = adaptNotifications(response).map((item) => item.id);

    expect(first).toEqual(["a", "b", "c"]);
    expect(second).toEqual(first);
  });

  it("returns an empty list for anything that is not an array", () => {
    expect(adaptNotifications(null)).toEqual([]);
    expect(adaptNotifications({ nope: true })).toEqual([]);
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-09-14T12:00:00.000Z");

  it.each([
    ["Just now", new Date("2026-09-14T11:59:40.000Z")],
    ["5 minutes ago", new Date("2026-09-14T11:55:00.000Z")],
    ["1 minute ago", new Date("2026-09-14T11:59:00.000Z")],
    ["3 hours ago", new Date("2026-09-14T09:00:00.000Z")],
    ["Yesterday", new Date("2026-09-13T09:00:00.000Z")],
  ])("renders %s", (expected, date) => {
    expect(formatRelativeTime(date, now)).toBe(expected);
  });

  it("says so when a timestamp is in the future beyond clock skew", () => {
    expect(
      formatRelativeTime(new Date("2026-09-14T14:00:00.000Z"), now),
    ).toMatch(/^Scheduled for /);
  });

  it("returns an empty label for a missing date", () => {
    expect(formatRelativeTime(null, now)).toBe("");
  });
});
