import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

vi.mock("./services/authApi", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    getAuthSession: vi.fn(() => ({
      accessToken: "test-access-token",
      user: {
        role: "user",
      },
    })),
    restoreAuthSession: vi.fn(async () => ({
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      user: {
        role: "user",
      },
    })),
    logoutUser: vi.fn(async () => {}),
  };
});

vi.mock("./services/phoenixApi", () => ({
  getNotificationUnreadCount: vi.fn(),
}));

vi.mock("./PreferencesContext", () => ({
  usePreferences: () => ({
    preferences: {
      confirmImportantActions: false,
      dateFormat: "DD/MM/YYYY",
    },
  }),
}));

vi.mock("./Dashboard", () => ({
  default: () => <div>Dashboard test page</div>,
}));

vi.mock("./Sidebar", () => ({
  default: () => <aside>Sidebar</aside>,
}));

vi.mock("./Footer", () => ({
  default: () => <footer>Footer</footer>,
}));

vi.mock("./components/GlobalSearch", () => ({
  default: () => <div>Search</div>,
}));

vi.mock("./components/notifier", () => ({
  default: () => <div>Notification panel</div>,
}));

vi.mock("./config/routes", async () => {
  const actual = await vi.importActual("./config/routes");

  return {
    ...actual,
    routeForPath: (pathname) => ({
      title: pathname === "/dashboard" ? "Dashboard" : "PHOENIX",
    }),
  };
});

import { getNotificationUnreadCount } from "./services/phoenixApi";

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <App />
    </MemoryRouter>,
  );

describe("notification header badge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides the badge when there are zero unread notifications", async () => {
    getNotificationUnreadCount.mockResolvedValue({
      unreadCount: 0,
    });

    renderApp();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Notifications",
        }),
      ).toBeInTheDocument();
    });

    expect(
      document.querySelector(".notification-unread-badge"),
    ).toBeNull();
  });

  it("shows the exact unread count from 1 through 99", async () => {
    getNotificationUnreadCount.mockResolvedValue({
      unreadCount: 7,
    });

    renderApp();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Notifications, 7 unread",
        }),
      ).toBeInTheDocument();
    });

    expect(
      document.querySelector(".notification-unread-badge"),
    ).toHaveTextContent("7");
  });

  it("shows 99+ for counts above 99", async () => {
    getNotificationUnreadCount.mockResolvedValue({
      unreadCount: 125,
    });

    renderApp();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Notifications, 125 unread",
        }),
      ).toBeInTheDocument();
    });

    expect(
      document.querySelector(".notification-unread-badge"),
    ).toHaveTextContent("99+");
  });

  it("keeps the badge absent when the REST request fails", async () => {
    getNotificationUnreadCount.mockRejectedValue(
      new Error("Notification service unavailable"),
    );

    renderApp();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Notifications, unread count unavailable",
        }),
      ).toBeInTheDocument();
    });

    expect(
      document.querySelector(".notification-unread-badge"),
    ).toBeNull();
  });
});

