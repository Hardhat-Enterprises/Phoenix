import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationList from "./NotificationList";
import { adaptNotifications } from "../services/notificationAdapter";

// ---------------------------------------------------------------------------
// The list is exercised entirely through injected records and injected
// callbacks. Nothing here imports the API layer or the search and filter
// controls, which is the point: this component is finished and testable before
// either of them exists.
// ---------------------------------------------------------------------------

const NOW = new Date("2026-09-14T12:00:00.000Z");

const RAW = [
  {
    id: "n1",
    title: "Ransomware signature matched",
    body: "Host db-prod-1 matched a known loader.",
    event_type: "threat_detected",
    severity: "critical",
    created_at: "2026-09-14T11:30:00.000Z",
    read: false,
    metadata: '{"source_ip":"10.0.0.41","confidence":0.94}',
  },
  {
    id: "n2",
    title: "Unusual sign-in location",
    body: "Sign-in from an unrecognised country.",
    event_type: "anomaly_detected",
    severity: "high",
    created_at: "2026-09-14T09:00:00.000Z",
    read: false,
    metadata: { user: "j.patel" },
  },
  {
    id: "n3",
    title: "Ingestion backlog cleared",
    event_type: "SYSTEM.MAINTENANCE",
    severity: "info",
    created_at: "2026-09-13T09:00:00.000Z",
    read: true,
    // Truncated mid-write by the producer.
    metadata: '{"queue":"ingest-core","depth":',
  },
];

const records = (raw = RAW) => adaptNotifications(raw);

const MOCK_PROVIDER = {
  id: "mock",
  label: "Mock notification data",
  persists: false,
  isMock: true,
};

const LIVE_PROVIDER = {
  id: "api",
  label: "Phoenix API gateway",
  persists: true,
  isMock: false,
};

const renderList = (props = {}) => {
  const actions = {
    markRead: vi.fn().mockResolvedValue({}),
    markAllRead: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    ...(props.actions || {}),
  };

  const utils = render(
    <NotificationList
      notifications={records()}
      status="ready"
      provider={MOCK_PROVIDER}
      now={NOW}
      onRefresh={vi.fn()}
      onRetry={vi.fn()}
      {...props}
      actions={actions}
    />,
  );

  return { ...utils, actions, user: userEvent.setup() };
};

const unreadBadge = () => screen.queryByText(/\d+ unread/);

// The row's own button, not the delete button beside it: both carry the title
// in their accessible name.
const row = (name) => {
  const item = screen
    .getAllByRole("listitem")
    .find((element) =>
      element.querySelector(".notif-title")?.textContent.includes(name),
    );

  if (!item) {
    throw new Error(`No notification row titled ${name}`);
  }

  return item.querySelector(".notif-item-main");
};

const deleteButton = (name) =>
  screen.getByRole("button", { name: new RegExp(`^(Remove|Delete) ${name}`, "i") });

// A promise whose settlement the test controls, for asserting what the UI shows
// while a mutation is still in flight.
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe("presentation", () => {
  it("presents title, message, event type, severity and read state", () => {
    renderList();

    expect(screen.getByText("Ransomware signature matched")).toBeTruthy();
    expect(screen.getByText("Host db-prod-1 matched a known loader.")).toBeTruthy();
    expect(screen.getByText("Threat Detected")).toBeTruthy();
    expect(screen.getByText("Critical")).toBeTruthy();
    expect(screen.getAllByText("Unread")).toHaveLength(2);
    expect(screen.getByText("Read")).toBeTruthy();
  });

  it("shows a valid timestamp in a form both a reader and a machine can use", () => {
    renderList();

    const time = screen.getByText("30 minutes ago");

    expect(time.tagName).toBe("TIME");
    expect(time.getAttribute("dateTime")).toBe("2026-09-14T11:30:00.000Z");
  });

  it("falls back safely when a timestamp cannot be parsed", () => {
    renderList({
      notifications: records([
        { id: "bad", title: "Odd time", created_at: "not a real date" },
      ]),
    });

    expect(screen.getByText('Reported as "not a real date"')).toBeTruthy();
    expect(document.querySelector("time")).toBeNull();
  });

  it("says so when no timestamp was sent at all", () => {
    renderList({ notifications: records([{ id: "none", title: "No time" }]) });

    expect(screen.getByText("Time not provided")).toBeTruthy();
  });

  it("counts the unread records", () => {
    renderList();

    expect(unreadBadge().textContent).toBe("2 unread");
  });

  it("orders the list newest first and keeps that order", () => {
    renderList();

    const titles = screen
      .getAllByRole("listitem")
      .map((item) => item.querySelector(".notif-title").textContent);

    expect(titles[0]).toContain("Ransomware signature matched");
    expect(titles[2]).toContain("Ingestion backlog cleared");
  });
});

describe("load and refresh states", () => {
  it("shows an initial loading message only when nothing is on screen yet", () => {
    renderList({ notifications: [], status: "loading" });

    expect(screen.getByText("Loading notifications...")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows a background refresh without hiding the list", () => {
    renderList({ status: "refreshing" });

    expect(screen.getByText("Checking for new notifications...")).toBeTruthy();
    expect(screen.queryByText("Loading notifications...")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("keeps the last successful list visible when a refresh fails", () => {
    renderList({
      status: "error",
      error: Object.assign(new Error("kaboom"), { status: 500 }),
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("alert").textContent).toContain(
      "Showing the last notifications loaded",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("offers retry from a first load that failed outright", async () => {
    const onRetry = vi.fn();
    const { user } = renderList({
      notifications: [],
      status: "error",
      error: Object.assign(new Error("kaboom"), { status: 503 }),
      onRetry,
    });

    expect(screen.getByText("The notification service failed")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("reports a rejected request as a validation problem", () => {
    renderList({
      notifications: [],
      status: "error",
      error: Object.assign(new Error("Unprocessable"), {
        status: 422,
        data: { errors: ["id must be an integer"] },
      }),
    });

expect(screen.getByText("That request was rejected")).toBeTruthy();
expect(
  screen.getByText("Check the notification request and try again."),
).toBeTruthy();
expect(screen.queryByText("id must be an integer")).toBeNull();
  });

  it("offers an authentication recovery when the session has expired", async () => {
    const onSignIn = vi.fn();
    const { user } = renderList({
      notifications: [],
      status: "error",
      error: Object.assign(new Error("Invalid token"), { status: 401 }),
      onSignIn,
    });

    expect(screen.getByText("Your session has expired")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Sign in again" }));

    expect(onSignIn).toHaveBeenCalledTimes(1);
    // Retry is not offered for a failure that retrying cannot fix.
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("still explains an expired session when the host supplies no sign-in handler", () => {
    renderList({
      notifications: [],
      status: "error",
      error: Object.assign(new Error("Invalid token"), { status: 401 }),
    });

    expect(screen.getByText("Sign in again to continue.")).toBeTruthy();
  });

  it("does not offer retry for a permanent forbidden failure", () => {
    renderList({
      notifications: [],
      status: "error",
      error: Object.assign(new Error("Forbidden"), { status: 403 }),
      onRetry: vi.fn(),
    });

    expect(
      screen.getByText("Notification access is not permitted"),
    ).toBeTruthy();

    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).toBeNull();
  });
});

describe("empty states", () => {
  it("distinguishes an empty list from a filtered-out one", () => {
    const { rerender } = renderList({ notifications: [], status: "ready" });

    expect(screen.getByText("No notifications.")).toBeTruthy();

    rerender(
      <NotificationList
        notifications={records()}
        status="ready"
        provider={MOCK_PROVIDER}
        now={NOW}
        filters={{ query: "nothing matches this" }}
      />,
    );

    expect(screen.queryByText("No notifications.")).toBeNull();
    expect(
      screen.getByText(/No notifications match the current search or filters/),
    ).toBeTruthy();
    expect(screen.getByText(/3 hidden/)).toBeTruthy();
  });

  it("renders only the records the injected filters leave", () => {
    renderList({ filters: { unreadOnly: true } });

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("mark as read", () => {
  it("marks the opened record read, through the injected action", async () => {
    const { user, actions } = renderList();

    await user.click(row("Ransomware signature matched"));

    expect(actions.markRead).toHaveBeenCalledWith("n1");
    await waitFor(() => expect(unreadBadge().textContent).toBe("1 unread"));

    const modal = screen.getByRole("dialog", { name: /Ransomware/ });
    expect(within(modal).getByText("Read")).toBeTruthy();
  });

  it("does not re-mark a record that is already read", async () => {
    const { user, actions } = renderList();

    await user.click(row("Ingestion backlog cleared"));

    expect(actions.markRead).not.toHaveBeenCalled();
  });

  it("marks every eligible record read and updates the count", async () => {
    const { user, actions } = renderList();

    await user.click(screen.getByRole("button", { name: "Mark all read" }));

    expect(actions.markAllRead).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(unreadBadge()).toBeNull());
    expect(screen.getAllByText("Read")).toHaveLength(3);
  });

  it("disables mark all read when nothing is unread", () => {
    renderList({
      notifications: records([{ id: "r", title: "Read one", read: true }]),
    });

    expect(
      screen.getByRole("button", { name: "Mark all read" }).disabled,
    ).toBe(true);
  });
});

describe("delete", () => {
  it("removes only the record acted on", async () => {
    const { user, actions } = renderList();

    await user.click(deleteButton("Ransomware signature matched"));

    expect(actions.delete).toHaveBeenCalledWith("n1");
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
    expect(screen.queryByText("Ransomware signature matched")).toBeNull();
    expect(screen.getByText("Unusual sign-in location")).toBeTruthy();
  });

  it("closes the details view when the record it was showing is deleted", async () => {
    const { user } = renderList();

    await user.click(row("Unusual sign-in location"));
    const modal = screen.getByRole("dialog", { name: /Unusual sign-in/ });

    await user.click(
      within(modal).getByRole("button", { name: "Remove from this view" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /Unusual sign-in/ })).toBeNull(),
    );
  });
});

describe("optimistic updates", () => {
  it("shows the change before the action resolves", async () => {
    const gate = deferred();
    const { user } = renderList({
      actions: { markRead: vi.fn().mockReturnValue(gate.promise) },
    });

    await user.click(row("Ransomware signature matched"));

    // Applied optimistically, while the request is still outstanding.
    expect(unreadBadge().textContent).toBe("1 unread");

    gate.resolve({});
    await waitFor(() => expect(unreadBadge().textContent).toBe("1 unread"));
  });

  it("rolls back and explains when a mark-read action fails", async () => {
    const { user } = renderList({
      actions: {
        markRead: vi
          .fn()
          .mockRejectedValue(Object.assign(new Error("nope"), { status: 500 })),
      },
    });

    await user.click(row("Ransomware signature matched"));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not mark that notification as read",
      ),
    );
    expect(screen.getByRole("alert").textContent).toContain("Nothing was changed.");
    // The unread count is back where it started.
    expect(unreadBadge().textContent).toBe("2 unread");
  });

  it("restores a deleted record when the delete fails", async () => {
    const { user } = renderList({
      actions: {
        delete: vi
          .fn()
          .mockRejectedValue(Object.assign(new Error("nope"), { status: 500 })),
      },
    });

    await user.click(deleteButton("Ransomware signature matched"));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not delete that notification",
      ),
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Ransomware signature matched")).toBeTruthy();
  });

  it("restores every record when mark all read fails", async () => {
    const { user } = renderList({
      actions: {
        markAllRead: vi
          .fn()
          .mockRejectedValue(Object.assign(new Error("nope"), { status: 500 })),
      },
    });

    await user.click(screen.getByRole("button", { name: "Mark all read" }));

    await waitFor(() => expect(unreadBadge().textContent).toBe("2 unread"));
    expect(screen.getByRole("alert").textContent).toContain(
      "mark every notification as read",
    );
  });

  it("offers sign-in recovery when a mutation fails on an expired session", async () => {
    const onSignIn = vi.fn();
    const { user } = renderList({
      onSignIn,
      actions: {
        markRead: vi
          .fn()
          .mockRejectedValue(
            Object.assign(new Error("Invalid token"), { status: 401 }),
          ),
      },
    });

    await user.click(row("Ransomware signature matched"));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "your session has expired",
      ),
    );
    await user.click(screen.getByRole("button", { name: "Sign in again" }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it("refuses a second mutation while the same one is still pending", () => {
    const gate = deferred();
    const markAllRead = vi.fn().mockReturnValue(gate.promise);
    renderList({ actions: { markAllRead } });

    const button = screen.getByRole("button", { name: "Mark all read" });

    // Two clicks with no render between them: the button is not disabled yet,
    // so only the synchronous in-flight guard can refuse the second.
    fireEvent.click(button);
    fireEvent.click(button);

    expect(markAllRead).toHaveBeenCalledTimes(1);

    gate.resolve({});
  });

  it("still allows two different records to be in flight at once", () => {
    const gate = deferred();
    const remove = vi.fn().mockReturnValue(gate.promise);
    renderList({ actions: { delete: remove } });

    fireEvent.click(deleteButton("Ransomware signature matched"));
    fireEvent.click(deleteButton("Unusual sign-in location"));

    expect(remove.mock.calls.map(([id]) => id)).toEqual(["n1", "n2"]);

    gate.resolve({});
  });

  it("disables the control belonging to a pending mutation", async () => {
    const gate = deferred();
    const { user } = renderList({
      actions: { markAllRead: vi.fn().mockReturnValue(gate.promise) },
    });

    const button = screen.getByRole("button", { name: "Mark all read" });
    await user.click(button);

    expect(screen.getByRole("button", { name: "Marking..." }).disabled).toBe(true);

    gate.resolve({});
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Marking..." })).toBeNull(),
    );
  });

  it("lets fresh injected data replace an optimistic change", async () => {
    const { user, rerender } = renderList();

    await user.click(deleteButton("Ransomware signature matched"));
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));

    // The provider did not persist it, so the next load brings it back.
    rerender(
      <NotificationList
        notifications={records()}
        status="ready"
        provider={MOCK_PROVIDER}
        now={NOW}
        actions={{ delete: vi.fn() }}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});

describe("persistence wording", () => {
  it("never describes a mock action as saved to the server", async () => {
    const { user } = renderList();

    expect(
      screen.getByText(/running on mock notification data/),
    ).toBeTruthy();

    await user.click(row("Ransomware signature matched"));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "not saved to the server",
      ),
    );
    expect(screen.queryByText(/^Marked as read\.$/)).toBeNull();
  });

  it("labels the per-row control as a local change on a mock provider", () => {
    renderList();

    expect(
      screen.getByRole("button", {
        name: "Remove Ransomware signature matched from this view only",
      }),
    ).toBeTruthy();
  });

  it("keeps a disclaimer on a live provider until an action has actually succeeded", async () => {
    const { user } = renderList({ provider: LIVE_PROVIDER });

    expect(
      screen.getByText(/None has been confirmed saved in this session yet/),
    ).toBeTruthy();

    await user.click(row("Ransomware signature matched"));

    await waitFor(() =>
      expect(
        screen.queryByText(/None has been confirmed saved in this session yet/),
      ).toBeNull(),
    );
    expect(screen.getByRole("status").textContent).toContain("Marked as read.");
  });

  it("does not remove the disclaimer when the live action fails", async () => {
    const { user } = renderList({
      provider: LIVE_PROVIDER,
      actions: {
        markRead: vi
          .fn()
          .mockRejectedValue(Object.assign(new Error("nope"), { status: 500 })),
      },
    });

    await user.click(row("Ransomware signature matched"));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(
      screen.getByText(/None has been confirmed saved in this session yet/),
    ).toBeTruthy();
  });
});

describe("metadata", () => {
  it("shows parsed metadata in the details view", async () => {
    const { user } = renderList();

    await user.click(row("Ransomware signature matched"));
    const modal = screen.getByRole("dialog", { name: /Ransomware/ });

    expect(within(modal).getByText("Source IP")).toBeTruthy();
    expect(within(modal).getByText("10.0.0.41")).toBeTruthy();
    expect(within(modal).getByText("Confidence")).toBeTruthy();
  });

  it("shows metadata that arrived as an object", async () => {
    const { user } = renderList();

    await user.click(row("Unusual sign-in location"));
    const modal = screen.getByRole("dialog", { name: /Unusual sign-in/ });

    expect(within(modal).getByText("User")).toBeTruthy();
    expect(within(modal).getByText("j.patel")).toBeTruthy();
  });

  it("renders malformed metadata as unreadable instead of breaking the view", async () => {
    const { user } = renderList();

    await user.click(row("Ingestion backlog cleared"));
    const modal = screen.getByRole("dialog", { name: /Ingestion backlog/ });

    expect(
      within(modal).getByText(/details that are not readable/),
    ).toBeTruthy();
    expect(within(modal).getByText('{"queue":"ingest-core","depth":')).toBeTruthy();
  });

  it("renders a record whose metadata is missing entirely", async () => {
    const { user } = renderList({
      notifications: records([{ id: "x", title: "Bare record", metadata: null }]),
    });

    await user.click(row("Bare record"));

    expect(screen.getByRole("dialog", { name: /Bare record/ })).toBeTruthy();
    expect(screen.queryByText("Details")).toBeNull();
  });

  it("does not crash on metadata that is hostile rather than merely wrong", () => {
    const circular = { host: "db-1" };
    circular.self = circular;

    expect(() =>
      renderList({
        notifications: records([
          { id: "c1", title: "Circular", metadata: circular },
          { id: "c2", title: "Array", metadata: "[1,2,3]" },
          { id: "c3", title: "Scalar", metadata: "42" },
        ]),
      }),
    ).not.toThrow();

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});

describe("keyboard and focus", () => {
  it("walks the list with the arrow keys", async () => {
    const { user } = renderList();

    const first = row("Ransomware signature matched");
    first.focus();

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(row("Unusual sign-in location"));

    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(first);

    await user.keyboard("{End}");
    expect(document.activeElement).toBe(row("Ingestion backlog cleared"));

    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(first);
  });

  it("returns focus to the row that opened the details view", async () => {
    const { user } = renderList();

    const opener = row("Unusual sign-in location");
    opener.focus();
    await user.click(opener);

    const modal = screen.getByRole("dialog", { name: /Unusual sign-in/ });
    expect(document.activeElement).toBe(
      within(modal).getByRole("button", { name: "Close" }),
    );

    await user.click(within(modal).getByRole("button", { name: "Close" }));

    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("closes the details view on Escape before closing the panel", async () => {
    const onClose = vi.fn();
    const { user } = renderList({ onClose });

    await user.click(row("Unusual sign-in location"));
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /Unusual sign-in/ })).toBeNull(),
    );
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves focus to a remaining row after a delete", async () => {
    const { user } = renderList();

    await user.click(deleteButton("Ransomware signature matched"));

    await waitFor(() =>
      expect(document.activeElement).toBe(row("Unusual sign-in location")),
    );
  });

  it("announces action outcomes in a live region", async () => {
    const { user } = renderList();

    const live = screen.getByRole("status");
    expect(live.getAttribute("aria-live")).toBe("polite");

    await user.click(screen.getByRole("button", { name: "Mark all read" }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "All notifications marked as read",
      ),
    );
  });
});

describe("independence from its host", () => {
  it("renders with no actions at all, offering nothing that cannot work", () => {
    render(
      <NotificationList
        notifications={records()}
        status="ready"
        provider={MOCK_PROVIDER}
        now={NOW}
        actions={{}}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Mark all read" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Remove/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull();
  });

  it("renders with no props beyond its defaults", () => {
    expect(() => render(<NotificationList />)).not.toThrow();
    expect(screen.getByText("No notifications.")).toBeTruthy();
  });
});
