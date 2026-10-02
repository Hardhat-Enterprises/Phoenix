import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoginForm from "../components/LoginForm.jsx";
import { loginUser, saveAuthSession } from "../services/authApi";

vi.mock("../services/authApi", () => ({
  loginUser: vi.fn(),
  saveAuthSession: vi.fn(),
}));

const authResponse = {
  access_token: "access-token",
  user: { username: "testuser", role: "user" },
};

const savedSession = {
  accessToken: "access-token",
  user: { username: "testuser", role: "user" },
};

const deferred = () => {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

describe("LoginForm", () => {
  const mockOnLogin = vi.fn();
  const mockSetPage = vi.fn();

  const renderLogin = () => render(
    <MemoryRouter initialEntries={["/login"]}>
      <LoginForm setPage={mockSetPage} onLogin={mockOnLogin} />
    </MemoryRouter>,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    loginUser.mockResolvedValue(authResponse);
    saveAuthSession.mockReturnValue(savedSession);
  });

  it.each([
    ["  testuser  ", "testuser"],
    ["  test@example.com  ", "test@example.com"],
  ])(
    "submits a username or email through the existing login handler",
    async (enteredIdentifier, submittedIdentifier) => {
      const user = userEvent.setup();
      renderLogin();

      const usernameInput = screen.getByLabelText(/^Username or email$/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);

      await user.type(usernameInput, enteredIdentifier);
      await user.type(passwordInput, " password with spaces ");
      await user.click(screen.getByRole("button", { name: /^Sign in$/i }));

      await waitFor(() => {
        expect(loginUser).toHaveBeenCalledWith({
          username: submittedIdentifier,
          password: " password with spaces ",
        });
      });
      expect(saveAuthSession).toHaveBeenCalledWith(authResponse);
      expect(mockOnLogin).toHaveBeenCalledWith(savedSession);
      expect(mockSetPage).toHaveBeenCalledWith("dashboard");
    },
  );

  it("rejects a whitespace-only username and focuses it", async () => {
    const user = userEvent.setup();
    renderLogin();

    const usernameInput = screen.getByLabelText(/^Username or email$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);

    await user.type(usernameInput, "   ");
    await user.type(passwordInput, "password123");
    await user.click(screen.getByRole("button", { name: /^Sign in$/i }));

    const error = screen.getByText("Enter your username or email.");
    expect(usernameInput.getAttribute("aria-invalid")).toBe("true");
    expect(usernameInput.getAttribute("aria-describedby")).toBe(error.id);
    expect(passwordInput.getAttribute("aria-invalid")).toBe("false");
    expect(document.activeElement).toBe(usernameInput);
    expect(loginUser).not.toHaveBeenCalled();
  });

  it("rejects an empty password and focuses it", async () => {
    const user = userEvent.setup();
    renderLogin();

    const usernameInput = screen.getByLabelText(/^Username or email$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);

    await user.type(usernameInput, "testuser");
    await user.click(screen.getByRole("button", { name: /^Sign in$/i }));

    const error = screen.getByText("Enter your password.");
    expect(usernameInput.getAttribute("aria-invalid")).toBe("false");
    expect(passwordInput.getAttribute("aria-invalid")).toBe("true");
    expect(passwordInput.getAttribute("aria-describedby")).toBe(error.id);
    expect(document.activeElement).toBe(passwordInput);
    expect(loginUser).not.toHaveBeenCalled();
  });

  it("focuses the first invalid field when both fields are empty", async () => {
    const user = userEvent.setup();
    renderLogin();

    const usernameInput = screen.getByLabelText(/^Username or email$/i);

    await user.click(screen.getByRole("button", { name: /^Sign in$/i }));

    expect(document.activeElement).toBe(usernameInput);
    expect(screen.getByText("Enter your username or email.")).toBeTruthy();
    expect(screen.getByText("Enter your password.")).toBeTruthy();
  });

  it("shows and hides the password without changing its value", async () => {
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = screen.getByLabelText(/^Password$/i);
    const visibilityControl = screen.getByRole("checkbox", {
      name: /^Show password$/i,
    });

    await user.type(passwordInput, "secret value");
    expect(passwordInput.getAttribute("type")).toBe("password");

    await user.click(visibilityControl);
    expect(passwordInput.getAttribute("type")).toBe("text");
    expect(passwordInput.value).toBe("secret value");

    await user.click(visibilityControl);
    expect(passwordInput.getAttribute("type")).toBe("password");
    expect(passwordInput.value).toBe("secret value");
  });

  it("shows loading feedback and prevents repeated submission", async () => {
    const user = userEvent.setup();
    const gate = deferred();
    loginUser.mockReturnValueOnce(gate.promise);
    renderLogin();

    await user.type(
      screen.getByLabelText(/^Username or email$/i),
      "testuser",
    );
    await user.type(screen.getByLabelText(/^Password$/i), "password123");

    const submitButton = screen.getByRole("button", { name: /^Sign in$/i });
    await user.click(submitButton);

    expect(submitButton.disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toBe("Signing in...");
    expect(document.querySelector("form").getAttribute("aria-busy")).toBe("true");

    await user.click(submitButton);
    expect(loginUser).toHaveBeenCalledTimes(1);

    gate.resolve(authResponse);
    await waitFor(() => {
      expect(mockSetPage).toHaveBeenCalledWith("dashboard");
    });
  });

  it("shows a failed-login message without invalidating either field", async () => {
    const user = userEvent.setup();
    loginUser.mockRejectedValueOnce(new Error("Invalid credentials"));
    renderLogin();

    const usernameInput = screen.getByLabelText(/^Username or email$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);

    await user.type(usernameInput, "testuser");
    await user.type(passwordInput, "wrongpassword");
    await user.click(screen.getByRole("button", { name: /^Sign in$/i }));

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe(
        "Invalid credentials",
      );
    });
    expect(usernameInput.getAttribute("aria-invalid")).toBe("false");
    expect(passwordInput.getAttribute("aria-invalid")).toBe("false");
    expect(usernameInput.value).toBe("testuser");
    expect(passwordInput.value).toBe("wrongpassword");
    expect(mockOnLogin).not.toHaveBeenCalled();
    expect(mockSetPage).not.toHaveBeenCalled();
  });

  it("links Forgot Password to its existing destination", () => {
    renderLogin();

    const forgotPasswordLink = screen.getByRole("link", {
      name: /^Forgot password\?$/i,
    });
    expect(forgotPasswordLink.getAttribute("href")).toBe("/forgot-password");
    expect(loginUser).not.toHaveBeenCalled();
  });
});
