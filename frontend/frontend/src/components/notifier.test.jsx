import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { API_GATEWAY_URL, AUTH_STORAGE_KEY } from "../services/authApi";
import { mockAuthSession } from "../mocks/data";
import { server } from "../mocks/handler";
import NotificationPanel from "./notifier";
import { createMockNotificationProvider } from "../services/mockNotificationProvider";

// End to end through the wiring, on the mock provider: no gateway, no network,
// and no dependency on the real API adapter existing yet.

const renderPanel = (props = {}) => {
  const utils = render(
    <NotificationPanel
      provider={props.provider || createMockNotificationProvider()}
      {...props}
    />,
  );

  return { ...utils, user: userEvent.setup() };
};

const row = (name) => {
  const item = screen
    .getAllByRole("listitem")
    .find((element) =>
      element.querySelector(".notif-title")?.textContent.includes(name),
    );

  return item?.querySelector(".notif-item-main");
};

describe("NotificationPanel on the mock provider", () => {
  it("loads and lists the provider's notifications", async () => {
    renderPanel();

    expect(screen.getByText("Loading notifications...")).toBeTruthy();

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(5));
    expect(screen.getByText("Ransomware signature matched")).toBeTruthy();
    expect(screen.getByText(/\d+ unread/)).toBeTruthy();
  });

  it("marks a notification read through the provider and updates the count", async () => {
    const { user } = renderPanel();

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(5));
    const before = screen.getByText(/\d+ unread/).textContent;

    await user.click(row("Ransomware signature matched"));

    await waitFor(() =>
      expect(screen.getByText(/\d+ unread/).textContent).not.toBe(before),
    );
  });

  it("keeps the mock's changes across a refresh, and never calls them saved", async () => {
    const { user } = renderPanel();

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(5));

    await user.click(screen.getByRole("button", { name: "Mark all read" }));
    await waitFor(() => expect(screen.queryByText(/\d+ unread/)).toBeNull());

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    // The mock holds the change in memory, so it survives a reload...
    await waitFor(() => expect(screen.queryByText(/\d+ unread/)).toBeNull());
    // ...but it is still local, and the panel says so.
    expect(screen.getByText(/running on mock notification data/)).toBeTruthy();
  });

  it("renders a record whose metadata the producer truncated", async () => {
    const { user } = renderPanel();

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(5));

    await user.click(row("Ingestion backlog cleared"));
    const modal = screen.getByRole("dialog", { name: /Ingestion backlog/ });

    expect(within(modal).getByText(/details that are not readable/)).toBeTruthy();
  });

  it("surfaces a provider failure, then loads the list when the retry succeeds", async () => {
    const base = createMockNotificationProvider();
    let attempts = 0;
    const provider = {
      ...base,
      list: () => {
        attempts += 1;

        return attempts === 1
          ? Promise.reject(Object.assign(new Error("kaboom"), { status: 500 }))
          : base.list();
      },
    };

    const { user } = renderPanel({ provider });

    await waitFor(() =>
      expect(screen.getByText("The notification service failed")).toBeTruthy(),
    );
    expect(screen.queryByRole("list")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(5));
    expect(screen.queryByText("The notification service failed")).toBeNull();
    expect(attempts).toBe(2);
  });

  it("offers authentication recovery when the provider rejects with 401", async () => {
    let signedIn = false;
    const { user } = renderPanel({
      onSignIn: () => {
        signedIn = true;
      },
      provider: createMockNotificationProvider({
        failOn: { list: { status: 401, message: "Invalid token" } },
      }),
    });

    await waitFor(() =>
      expect(screen.getByText("Your session has expired")).toBeTruthy(),
    );

    await user.click(screen.getByRole("button", { name: "Sign in again" }));
    expect(signedIn).toBe(true);
  });

  it("rolls back a delete the provider refuses", async () => {
    const provider = createMockNotificationProvider();
    provider.remove = () =>
      Promise.reject(Object.assign(new Error("nope"), { status: 500 }));

    const { user } = renderPanel({ provider });

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(5));

    await user.click(
      screen.getByRole("button", {
        name: /^Remove Ransomware signature matched/,
      }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not delete that notification",
      ),
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("applies filters handed to it by the host", async () => {
    renderPanel({ filters: { query: "ransomware" } });

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
    expect(screen.getByText("Ransomware signature matched")).toBeTruthy();
  });

  it("reports when a filter hides everything", async () => {
    renderPanel({ filters: { query: "nothing matches this" } });

    await waitFor(() =>
      expect(
        screen.getByText(/No notifications match the current search or filters/),
      ).toBeTruthy(),
    );
  });
});

const realId = "11111111-1111-4111-8111-111111111111";
const apiUrl = `${API_GATEWAY_URL}/api/notifications`;
const identified = () => ({
  id: realId,
  title: "Server notification",
  message: "Saved notification",
  is_read: false,
});
const withoutId = () => ({
  title: "No ID notification",
  message: "Cannot be changed on the server",
  is_read: false,
});
const listResponse = (notifications) => ({
  status: 200,
  data: {
    notifications,
    pagination: {
      total: notifications.length,
      page: 1,
      limit: 10,
      totalPages: notifications.length ? 1 : 0,
    },
  },
});

const liveRow = (title) =>
  screen.getAllByRole("listitem").find((item) => item.textContent.includes(title));

const renderLivePanel = async () => {
  const user = userEvent.setup();
  render(<NotificationPanel onClose={() => {}} />);
  await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
  return user;
};

describe("live notification item actions with mocked HTTP", () => {
  let records;
  let patchCount;
  let deleteCount;
  let patchPath;
  let deletePath;

  beforeEach(() => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockAuthSession));
    records = [identified(), withoutId()];
    patchCount = 0;
    deleteCount = 0;
    patchPath = undefined;
    deletePath = undefined;

    server.use(
      http.get(apiUrl, () => HttpResponse.json(listResponse(records))),
      http.patch(`${apiUrl}/:notificationId/read`, ({ params, request }) => {
        patchCount += 1;
        patchPath = new URL(request.url).pathname;
        records = records.map((item) =>
          String(item.id) === params.notificationId ? { ...item, is_read: true } : item,
        );
        return HttpResponse.json({
          status: 200,
          data: { notification: records.find((item) => String(item.id) === params.notificationId) },
        });
      }),
      http.delete(`${apiUrl}/:notificationId`, ({ params, request }) => {
        deleteCount += 1;
        deletePath = new URL(request.url).pathname;
        records = records.filter((item) => String(item.id) !== params.notificationId);
        return HttpResponse.json({ status: 200, message: "Notification deleted" });
      }),
    );
  });

  it("uses a numeric server ID for mark-read and dismiss, but sends nothing for a missing ID", async () => {
    records = [{ ...identified(), id: 7, title: "Numeric server notification" }, withoutId()];
    const user = await renderLivePanel();

    await user.click(liveRow("Numeric server notification").querySelector(".notif-item-main"));
    await waitFor(() => expect(patchPath).toBe("/api/notifications/7/read"));
    await waitFor(() => expect(liveRow("Numeric server notification").className).toContain("read"));

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Dismiss Numeric server notification" }));
    await waitFor(() => expect(deletePath).toBe("/api/notifications/7"));
    await waitFor(() => expect(liveRow("Numeric server notification")).toBeUndefined());

    await user.click(liveRow("No ID notification").querySelector(".notif-item-main"));
    expect(patchCount).toBe(1);
    expect(liveRow("No ID notification").className).toContain("unread");
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Dismiss No ID notification" }));
    expect(deleteCount).toBe(1);
    expect(liveRow("No ID notification")).toBeTruthy();
  });

  it("marks a server-ID item read through the live handler and keeps it read after a mocked refresh", async () => {
    const user = await renderLivePanel();

    await user.click(liveRow("Server notification").querySelector(".notif-item-main"));
    await waitFor(() => expect(patchCount).toBe(1));
    await waitFor(() => expect(liveRow("Server notification").className).toContain("read"));

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(liveRow("Server notification").className).toContain("read"));
  });

  it("dismisses a server-ID item through the live handler and keeps it absent after a mocked refresh", async () => {
    const user = await renderLivePanel();

    await user.click(screen.getByRole("button", { name: "Dismiss Server notification" }));
    await waitFor(() => expect(deleteCount).toBe(1));
    await waitFor(() => expect(liveRow("Server notification")).toBeUndefined());

    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(liveRow("Server notification")).toBeUndefined());
  });

  it("leaves a server item without an ID unread and reports why mark-read failed", async () => {
    const user = await renderLivePanel();

    await user.click(liveRow("No ID notification").querySelector(".notif-item-main"));

    expect(patchCount).toBe(0);
    expect(liveRow("No ID notification").className).toContain("unread");
    expect(screen.getByText(/no server ID was provided. Nothing changed./)).toBeTruthy();
  });

  it("leaves a server item without an ID visible and reports why dismiss failed", async () => {
    const user = await renderLivePanel();

    await user.click(screen.getByRole("button", { name: "Dismiss No ID notification" }));

    expect(deleteCount).toBe(0);
    expect(liveRow("No ID notification")).toBeTruthy();
    expect(screen.getByText(/no server ID was provided. Nothing changed./)).toBeTruthy();
  });

  it("keeps a server item unchanged when mark-read or dismiss is rejected", async () => {
    server.use(
      http.patch(`${apiUrl}/:notificationId/read`, () =>
        HttpResponse.json({ message: "Server failed" }, { status: 500 }),
      ),
      http.delete(`${apiUrl}/:notificationId`, () =>
        HttpResponse.json({ message: "Server failed" }, { status: 500 }),
      ),
    );
    const user = await renderLivePanel();

    await user.click(liveRow("Server notification").querySelector(".notif-item-main"));
    await waitFor(() => expect(screen.getByText(/Could not mark that notification as read/)).toBeTruthy());
    expect(liveRow("Server notification").className).toContain("unread");

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Dismiss Server notification" }));
    await waitFor(() => expect(screen.getByText(/Could not dismiss that notification/)).toBeTruthy());
    expect(liveRow("Server notification")).toBeTruthy();
  });

  it("keeps Clear all local and restores items on a mocked refresh", async () => {
    const user = await renderLivePanel();

    await user.click(screen.getByRole("button", { name: "Clear all (this device only)" }));
    expect(patchCount).toBe(0);
    expect(deleteCount).toBe(0);
    expect(screen.getByText(/You cleared these on this device/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
  });
});
