import { describe, expect, it } from "vitest";
import {
  countUnread,
  deriveListView,
  filterNotifications,
  hasActiveFilters,
  hasMarkAllReadWork,
  LIST_VIEWS,
  markAllReadInList,
  markReadInList,
  mutationKey,
  removeFromList,
} from "./notificationListState";

const items = [
  {
    id: 1,
    title: "Alpha",
    hasReadState: true,
    read: false,
    severity: "High",
    eventType: "Threat Detected",
  },
  {
    id: 2,
    title: "Beta",
    hasReadState: true,
    read: true,
    severity: "Low",
    eventType: "System Maintenance",
  },
  // A record the backend sent without read state: it is neither read nor
  // unread, and must not be counted as either.
  { id: 3, title: "Gamma", hasReadState: false, read: false },
];

describe("unread counting", () => {
  it("counts only records that report an unread state", () => {
    expect(countUnread(items)).toBe(1);
  });

  it("has nothing to do when everything readable is read", () => {
    expect(hasMarkAllReadWork(markAllReadInList(items))).toBe(false);
  });
});

describe("list mutations", () => {
  it("marks one record read without touching the others", () => {
    const next = markReadInList(items, 1);

    expect(countUnread(next)).toBe(0);
    expect(next[1]).toBe(items[1]);
    expect(next[2]).toBe(items[2]);
  });

  it("marks every eligible record read and leaves the rest alone", () => {
    const next = markAllReadInList(items);

    expect(next.map((item) => item.read)).toEqual([true, true, false]);
    expect(next[2].hasReadState).toBe(false);
  });

  it("removes only the named record", () => {
    expect(removeFromList(items, 2).map((item) => item.id)).toEqual([1, 3]);
  });

  it("matches ids across string and number forms", () => {
    expect(removeFromList(items, "2")).toHaveLength(2);
    expect(countUnread(markReadInList(items, "1"))).toBe(0);
  });

  it("never mutates the list it was given, so a rollback can restore it", () => {
    const snapshot = JSON.stringify(items);

    markReadInList(items, 1);
    markAllReadInList(items);
    removeFromList(items, 1);

    expect(JSON.stringify(items)).toBe(snapshot);
  });
});

describe("filtering", () => {
  it("returns everything when no filters are supplied", () => {
    expect(filterNotifications(items, null)).toBe(items);
    expect(filterNotifications(items, {})).toHaveLength(3);
  });

  it("matches a query against title, event type and severity", () => {
    expect(filterNotifications(items, { query: "beta" })).toHaveLength(1);
    expect(filterNotifications(items, { query: "threat" })).toHaveLength(1);
    expect(filterNotifications(items, { query: "zzz" })).toHaveLength(0);
  });

  it("matches a query against metadata values", () => {
    const withMetadata = [
      {
        ...items[0],
        metadata: { entries: [{ label: "Host", value: "db-prod-1" }] },
      },
    ];

    expect(filterNotifications(withMetadata, { query: "db-prod" })).toHaveLength(1);
  });

  it("filters to unread only", () => {
    expect(filterNotifications(items, { unreadOnly: true })).toHaveLength(1);
  });

  it("filters by severity and event type, case-insensitively", () => {
    expect(filterNotifications(items, { severity: ["high"] })).toHaveLength(1);
    expect(
      filterNotifications(items, { eventType: "system maintenance" }),
    ).toHaveLength(1);
  });

  it("treats an empty filter list as no filter", () => {
    expect(filterNotifications(items, { severity: [] })).toHaveLength(3);
    expect(hasActiveFilters({ severity: [], query: "  " })).toBe(false);
    expect(hasActiveFilters({ query: "beta" })).toBe(true);
  });
});

describe("deriveListView", () => {
  it("shows initial loading only when there is nothing to look at yet", () => {
    expect(deriveListView({ status: "loading", items: [] })).toBe(
      LIST_VIEWS.INITIAL_LOADING,
    );
    expect(deriveListView({ status: "loading", items })).toBe(LIST_VIEWS.ITEMS);
  });

  it("blocks on an error only when no list ever loaded", () => {
    expect(deriveListView({ status: "error", items: [] })).toBe(
      LIST_VIEWS.BLOCKING_ERROR,
    );
    expect(deriveListView({ status: "error", items })).toBe(LIST_VIEWS.ITEMS);
  });

  it("separates an empty list from a list filtered down to nothing", () => {
    expect(deriveListView({ status: "ready", items: [], visibleItems: [] })).toBe(
      LIST_VIEWS.EMPTY,
    );
    expect(
      deriveListView({
        status: "ready",
        items,
        visibleItems: [],
        filters: { query: "zzz" },
      }),
    ).toBe(LIST_VIEWS.NO_MATCHES);
  });

  it("does not claim a filter hid the list when no filter is active", () => {
    expect(
      deriveListView({ status: "ready", items, visibleItems: [], filters: null }),
    ).toBe(LIST_VIEWS.EMPTY);
  });
});

describe("mutationKey", () => {
  it("keys per record so two records can be in flight at once", () => {
    expect(mutationKey("delete", 4)).toBe("delete:4");
    expect(mutationKey("markAllRead")).toBe("markAllRead");
  });
});
