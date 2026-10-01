import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ForgotPassword from "./ForgotPassword";

const enterEmail = (value = "user@example.com") => {
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value },
  });
};

const submitForm = () => {
  fireEvent.click(
    screen.getByRole("button", {
      name: /send recovery instructions/i,
    }),
  );
};

describe("ForgotPassword", () => {
  it("renders the default recovery form", () => {
    render(<ForgotPassword setPage={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: /forgot password/i }),
    ).toBeTruthy();

    expect(screen.getByLabelText(/email address/i)).toBeTruthy();

    expect(
      screen.getByRole("button", {
        name: /send recovery instructions/i,
      }),
    ).toBeTruthy();

    expect(
      screen.getByRole("button", { name: /back to login/i }),
    ).toBeTruthy();
  });

  it("shows validation when the email is empty", () => {
    render(<ForgotPassword setPage={vi.fn()} />);

    submitForm();

    expect(
      screen.getByText("Enter your email address."),
    ).toBeTruthy();

    expect(
      screen.getByLabelText(/email address/i).getAttribute(
        "aria-invalid",
      ),
    ).toBe("true");
  });

  it("shows validation for an invalid email", () => {
    render(<ForgotPassword setPage={vi.fn()} />);

    enterEmail("invalid-email");
    submitForm();

    expect(
      screen.getByText(
        /enter a valid email address/i,
      ),
    ).toBeTruthy();
  });

  it("shows loading while the request is pending", async () => {
    const requestPasswordReset = vi.fn(
      () => new Promise(() => {}),
    );

    render(
      <ForgotPassword
        setPage={vi.fn()}
        requestPasswordReset={requestPasswordReset}
      />,
    );

    enterEmail();
    submitForm();

    expect(
      await screen.findByRole("button", {
        name: /sending recovery instructions/i,
      }),
    ).toBeTruthy();

    expect(
      screen.getByLabelText(/email address/i).disabled,
    ).toBe(true);
  });

  it("shows an enumeration-safe success message", async () => {
    const requestPasswordReset = vi.fn().mockResolvedValue({});

    render(
      <ForgotPassword
        setPage={vi.fn()}
        requestPasswordReset={requestPasswordReset}
      />,
    );

    enterEmail();
    submitForm();

    expect(
      await screen.findByText(
        /if an account is associated with this email address/i,
      ),
    ).toBeTruthy();

    expect(requestPasswordReset).toHaveBeenCalledWith(
      "user@example.com",
    );
  });

  it("handles rate limiting", async () => {
    const error = new Error("Too many requests");
    error.status = 429;

    const requestPasswordReset = vi
      .fn()
      .mockRejectedValue(error);

    render(
      <ForgotPassword
        setPage={vi.fn()}
        requestPasswordReset={requestPasswordReset}
      />,
    );

    enterEmail();
    submitForm();

    expect(
      await screen.findByText(/too many recovery requests/i),
    ).toBeTruthy();
  });

  it("shows service failure without revealing account existence", async () => {
    const requestPasswordReset = vi
      .fn()
      .mockRejectedValue(new Error("Service unavailable"));

    render(
      <ForgotPassword
        setPage={vi.fn()}
        requestPasswordReset={requestPasswordReset}
      />,
    );

    enterEmail();
    submitForm();

    expect(
      await screen.findByText(
        /password recovery is temporarily unavailable/i,
      ),
    ).toBeTruthy();

    expect(
      screen.queryByText(/account does not exist/i),
    ).toBeNull();

    expect(
      screen.queryByText(/email not found/i),
    ).toBeNull();
  });

  it("uses the service-error state when no recovery provider exists", async () => {
    render(<ForgotPassword setPage={vi.fn()} />);

    enterEmail();
    submitForm();

    expect(
      await screen.findByText(
        /password recovery is temporarily unavailable/i,
      ),
    ).toBeTruthy();
  });

  it("returns to Login", () => {
    const setPage = vi.fn();

    render(<ForgotPassword setPage={setPage} />);

    fireEvent.click(
      screen.getByRole("button", { name: /back to login/i }),
    );

    expect(setPage).toHaveBeenCalledWith("login");
  });

  it("trims the email before submission", async () => {
    const requestPasswordReset = vi.fn().mockResolvedValue({});

    render(
      <ForgotPassword
        setPage={vi.fn()}
        requestPasswordReset={requestPasswordReset}
      />,
    );

    enterEmail("  user@example.com  ");
    submitForm();

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith(
        "user@example.com",
      );
    });
  });
});