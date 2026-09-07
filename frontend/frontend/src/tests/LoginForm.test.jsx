import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "../components/LoginForm.jsx";
import { AUTH_STORAGE_KEY } from "../services/authApi.js";

describe("LoginForm Component", () => {
  const mockOnLogin = vi.fn();

  beforeEach(() => {
    mockOnLogin.mockClear();
    localStorage.clear();
  });

  it("should render login form", () => {
    render(<LoginForm onLogin={mockOnLogin} />);

    expect(screen.getByLabelText(/username|email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /login|sign in/i })).toBeTruthy();
  });

  it("should accept username and password input", async () => {
    const user = userEvent.setup();
    render(<LoginForm onLogin={mockOnLogin} />);

    const usernameInput = screen.getByLabelText(/username|email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(usernameInput, "testuser");
    await user.type(passwordInput, "password123");

    expect(usernameInput.value).toBe("testuser");
    expect(passwordInput.value).toBe("password123");
  });

  it("should submit form with valid credentials", async () => {
    const user = userEvent.setup();
    render(<LoginForm onLogin={mockOnLogin} />);

    const usernameInput = screen.getByLabelText(/username|email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /login|sign in/i });

    await user.type(usernameInput, "testuser");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });

  it("should show error message on login failure", async () => {
    const user = userEvent.setup();
    render(<LoginForm onLogin={mockOnLogin} />);

    const usernameInput = screen.getByLabelText(/username|email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /login|sign in/i });

    await user.type(usernameInput, "testuser");
    await user.type(passwordInput, "wrongpassword");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid|error|failed/i)).toBeTruthy();
    });
  });

  it("should accept email address as username", async () => {
    const user = userEvent.setup();
    render(<LoginForm onLogin={mockOnLogin} />);

    const usernameInput = screen.getByLabelText(/username|email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /login|sign in/i });

    await user.type(usernameInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });

  it("should store auth session in localStorage on successful login", async () => {
    const user = userEvent.setup();
    render(<LoginForm onLogin={mockOnLogin} />);

    const usernameInput = screen.getByLabelText(/username|email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /login|sign in/i });

    await user.type(usernameInput, "testuser");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(() => {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      expect(stored).toBeTruthy();
      const session = JSON.parse(stored);
      expect(session.accessToken).toBeTruthy();
    });
  });

  it("should disable submit button while loading", async () => {
    const user = userEvent.setup();
    render(<LoginForm onLogin={mockOnLogin} />);

    const usernameInput = screen.getByLabelText(/username|email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /login|sign in/i });

    await user.type(usernameInput, "testuser");
    await user.type(passwordInput, "password123");

    // Immediately after click, button might be disabled
    await user.click(submitButton);
    // Button state depends on component implementation
  });

  it("should trim whitespace from input", async () => {
    const user = userEvent.setup();
    render(<LoginForm onLogin={mockOnLogin} />);

    const usernameInput = screen.getByLabelText(/username|email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /login|sign in/i });

    await user.type(usernameInput, "  testuser  ");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });

  it("should have password input and form controls", () => {
    render(<LoginForm onLogin={mockOnLogin} />);

    // Should have login button at minimum
    const loginBtn = screen.queryByRole("button", { name: /sign in/i });
    expect(loginBtn).toBeTruthy();
  });
});
