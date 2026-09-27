import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
