import { useEffect, useRef, useState } from "react";
import { requestPasswordReset } from "./services/authApi";
import "./AuthForms.css";

const RESEND_COOLDOWN_SECONDS = 30;

// Deliberately loose — this only needs to catch obviously-empty or
// whitespace-only input. Real validation of "does this account exist"
// must never happen client-side (see authApi.requestPasswordReset).
const isBlank = (value) => !value || !value.trim();

export default function ForgotPassword({ setPage }) {
  const [identifier, setIdentifier] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error | unavailable
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  };

  const submitRequest = async (event) => {
    event?.preventDefault();

    if (isBlank(identifier)) {
      setFieldError("Enter your username or email to continue.");
      return;
    }

    setFieldError("");
    setStatus("submitting");
    setMessage("");

    try {
      const result = await requestPasswordReset(identifier);
      setStatus("success");
      setMessage(result.message);
      startCooldown();
    } catch (error) {
      if (error.code === "PASSWORD_RESET_UNAVAILABLE") {
        setStatus("unavailable");
      } else {
        setStatus("error");
      }
      setMessage(error.message);
    }
  };

  const isSubmitting = status === "submitting";
  const canResend = (status === "success" || status === "error") && cooldown === 0;

  return (
    <div className="forgot-page-wrapper">
      <div className="forgot-password-card">
        <h2>Forgot Password</h2>
        <p className="forgot-subtext">
          Enter your username or email and we'll send a password reset link if
          an account matches.
        </p>

        <form onSubmit={submitRequest} noValidate>
          <div className="auth-field-group">
            <label htmlFor="reset-email">
              Username or Email<span className="auth-required-indicator">*</span>
            </label>
            <input
              id="reset-email"
              type="text"
              placeholder="Enter your username or email"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value);
                if (fieldError) setFieldError("");
              }}
              disabled={isSubmitting}
              required
              aria-required="true"
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? "reset-email-error" : undefined}
            />
            {fieldError && (
              <p className="auth-field-error" id="reset-email-error" role="alert">
                {fieldError}
              </p>
            )}
          </div>

          {status === "success" && (
            <p className="login-message login-success" role="status" aria-live="polite">
              {message}
            </p>
          )}
          {status === "unavailable" && (
            <p className="login-message login-error" role="alert" aria-live="assertive">
              {message}
            </p>
          )}
          {status === "error" && (
            <p className="login-message login-error" role="alert" aria-live="assertive">
              {message}
            </p>
          )}

          <button type="submit" className="forgot-btn" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting && <span className="auth-submit-spinner" aria-hidden="true" />}
            {isSubmitting ? "Sending..." : "Send Password Reset"}
          </button>

          {(status === "success" || status === "error") && (
            <div className="auth-resend-row">
              {canResend ? (
                <button type="button" className="auth-btn-secondary" onClick={submitRequest}>
                  Resend link
                </button>
              ) : (
                <span>Resend available in {cooldown}s</span>
              )}
            </div>
          )}
        </form>

        <button
          type="button"
          className="back-login-btn"
          onClick={() => setPage("login")}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
