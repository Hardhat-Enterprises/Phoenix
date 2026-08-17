import { useState } from "react";
import { loginUser, saveAuthSession, getSafeAuthErrorMessage } from "../services/authApi";
import "../AuthForms.css";

export default function LoginForm({ setPage, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkCapsLock = (event) => {
    if (typeof event.getModifierState === "function") {
      setCapsLockOn(event.getModifierState("CapsLock"));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    if (!username.trim() || !password) {
      setErrorMessage("Enter both username and password to sign in.");
      return;
    }

    // Prevent repeated submissions while a request is already in flight.
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await loginUser({
        username: username.trim(),
        password,
      });

      const savedSession = saveAuthSession(session);
      onLogin?.(savedSession);
      setStatusMessage("Signed in successfully. Opening dashboard...");
      setPage("dashboard");
    } catch (error) {
      // Username is intentionally left in place so the person doesn't have
      // to retype it after a failed attempt. Message is sanitized so an
      // unexpected backend failure (5xx, malformed response) never renders
      // raw internals to the screen.
      setErrorMessage(
        getSafeAuthErrorMessage(
          error,
          "Something went wrong signing in. Please try again.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-field-group">
        <label htmlFor="login-username">
          Username or Email<span className="auth-required-indicator">*</span>
        </label>
        <input
          id="login-username"
          type="text"
          name="username"
          placeholder="Enter your username or email"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
          aria-required="true"
        />
      </div>

      <div className="auth-field-group">
        <label htmlFor="login-password">
          Password<span className="auth-required-indicator">*</span>
        </label>
        <div className="auth-password-row">
          <input
            id="login-password"
            className="auth-password-input"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyUp={checkCapsLock}
            onKeyDown={checkCapsLock}
            autoComplete="current-password"
            required
            aria-required="true"
            aria-describedby={capsLockOn ? "login-capslock-warning" : undefined}
          />
          <button
            type="button"
            className="auth-toggle-visibility"
            onClick={() => setShowPassword((current) => !current)}
            aria-pressed={showPassword}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {capsLockOn && (
          <p className="auth-capslock-warning" id="login-capslock-warning" role="status">
            Caps Lock is on
          </p>
        )}
      </div>

      {errorMessage && (
        <p className="login-message login-error" role="alert" aria-live="assertive">
          {errorMessage}
        </p>
      )}
      {statusMessage && (
        <p className="login-message login-success" role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting && <span className="auth-submit-spinner" aria-hidden="true" />}
        {isSubmitting ? "Signing In..." : "Sign In"}
      </button>

      <div className="login-extra">
        <span
          className="forgot"
          onClick={() => setPage("forgotPassword")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setPage("forgotPassword");
            }
          }}
        >
          Forgotten Password?
        </span>

        <label className="remember">
          <input type="checkbox" />
          Remember Me
        </label>
      </div>

      {/* Account creation is admin-only (see CreateUser's access guard) —
          this points people to the right place instead of a public sign-up
          flow that the sprint spec explicitly says not to build. */}
      <p className="auth-no-account-note">
        Don't have an account? Contact your administrator to get one created.
      </p>

      <button type="button" onClick={() => setPage("about")}>
        About Us
      </button>
    </form>
  );
}
