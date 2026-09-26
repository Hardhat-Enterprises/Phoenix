import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NotificationConnectionStatus from "./NotificationConnectionStatus";
import { NOTIFICATION_CONNECTION_STATES } from "./notificationConnectionStates";

describe("NotificationConnectionStatus", () => {
  it("announces reconnecting without offering another retry", () => {
    render(
      <NotificationConnectionStatus
        status={NOTIFICATION_CONNECTION_STATES.RECONNECTING}
      />,
    );

    const status = screen.getByRole("status");

    expect(status.textContent).toContain("Reconnecting notifications");
    expect(
      screen.getByLabelText("Reconnection in progress"),
    ).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows temporarily unavailable with a retry action", () => {
    const onRetry = vi.fn();

    render(
      <NotificationConnectionStatus
        status={NOTIFICATION_CONNECTION_STATES.UNAVAILABLE}
        onRetry={onRetry}
      />,
    );

    const alert = screen.getByRole("alert");

    expect(alert.textContent).toContain(
      "Notifications temporarily unavailable",
    );

    const retryButton = screen.getByRole("button", {
      name: "Retry connection",
    });

    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("directs authentication failure to sign in", () => {
    const onSignIn = vi.fn();

    render(
      <NotificationConnectionStatus
        status={NOTIFICATION_CONNECTION_STATES.AUTH_REQUIRED}
        onSignIn={onSignIn}
      />,
    );

    const alert = screen.getByRole("alert");

    expect(alert.textContent).toContain("Sign in required");

    const signInButton = screen.getByRole("button", {
      name: "Sign in again",
    });

    fireEvent.click(signInButton);

    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it("announces that the connection has been restored", () => {
    render(
      <NotificationConnectionStatus
        status={NOTIFICATION_CONNECTION_STATES.CONNECTED}
      />,
    );

    const status = screen.getByRole("status");

    expect(status.textContent).toContain(
      "Notifications connected again",
    );
    expect(status.textContent).toContain(
      "Live notification updates are available again.",
    );
  });

  it("uses polite announcements for transitional states", () => {
    const { rerender } = render(
      <NotificationConnectionStatus
        status={NOTIFICATION_CONNECTION_STATES.RECONNECTING}
      />,
    );

    expect(
      screen.getByRole("status").getAttribute("aria-live"),
    ).toBe("polite");

    rerender(
      <NotificationConnectionStatus
        status={NOTIFICATION_CONNECTION_STATES.CONNECTED}
      />,
    );

    expect(
      screen.getByRole("status").getAttribute("aria-live"),
    ).toBe("polite");
  });

  it("uses assertive announcements for states needing user attention", () => {
    const { rerender } = render(
      <NotificationConnectionStatus
        status={NOTIFICATION_CONNECTION_STATES.UNAVAILABLE}
        onRetry={() => {}}
      />,
    );

    expect(
      screen.getByRole("alert").getAttribute("aria-live"),
    ).toBe("assertive");

    rerender(
      <NotificationConnectionStatus
        status={NOTIFICATION_CONNECTION_STATES.AUTH_REQUIRED}
        onSignIn={() => {}}
      />,
    );

    expect(
      screen.getByRole("alert").getAttribute("aria-live"),
    ).toBe("assertive");
  });

  it("uses a native keyboard-accessible button for recovery", () => {
    render(
      <NotificationConnectionStatus
        status={NOTIFICATION_CONNECTION_STATES.UNAVAILABLE}
        onRetry={() => {}}
      />,
    );

    const button = screen.getByRole("button", {
      name: "Retry connection",
    });

    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");

    button.focus();

    expect(document.activeElement).toBe(button);
  });

  it("does not render a retry action when retry is unavailable", () => {
    render(
      <NotificationConnectionStatus
        status={NOTIFICATION_CONNECTION_STATES.UNAVAILABLE}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: "Retry connection",
      }),
    ).toBeNull();
  });

  it("does not render a sign-in action without a sign-in handler", () => {
    render(
      <NotificationConnectionStatus
        status={NOTIFICATION_CONNECTION_STATES.AUTH_REQUIRED}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: "Sign in again",
      }),
    ).toBeNull();
  });

  it("renders nothing for an unsupported status", () => {
    const { container } = render(
      <NotificationConnectionStatus status="something-else" />,
    );

    expect(container.firstChild).toBeNull();
  });
});