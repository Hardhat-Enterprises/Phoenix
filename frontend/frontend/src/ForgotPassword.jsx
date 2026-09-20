import { useState } from "react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RECOVERY_STATES = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  RATE_LIMITED: "rate-limited",
  ERROR: "error",
};

export default function ForgotPassword({
  setPage,
  requestPasswordReset,
}) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [recoveryState, setRecoveryState] = useState(
    RECOVERY_STATES.IDLE,
  );

  const validateEmail = () => {
    const value = email.trim();

    if (!value) {
      setFieldError("Enter your email address.");
      return false;
    }

    if (!EMAIL_PATTERN.test(value)) {
      setFieldError(
        "Enter a valid email address, for example name@example.com.",
      );
      return false;
    }

    setFieldError("");
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateEmail()) {
      return;
    }

    setRecoveryState(RECOVERY_STATES.LOADING);

    try {
      if (typeof requestPasswordReset !== "function") {
        throw new Error("PASSWORD_RECOVERY_UNAVAILABLE");
      }

      await requestPasswordReset(email.trim());

      setRecoveryState(RECOVERY_STATES.SUCCESS);
    } catch (error) {
      if (
        error?.status === 429 ||
        error?.response?.status === 429
      ) {
        setRecoveryState(RECOVERY_STATES.RATE_LIMITED);
        return;
      }

      setRecoveryState(RECOVERY_STATES.ERROR);
    }
  };

  const isLoading =
    recoveryState === RECOVERY_STATES.LOADING;

  return (
    <main className="forgot-page-wrapper">
      <section
        className="forgot-password-card"
        aria-labelledby="forgot-password-heading"
      >
        <h1 id="forgot-password-heading">Forgot Password</h1>

        <p className="forgot-subtext">
          Enter the email address associated with your PHOENIX
          account. If an account matches this address, password
          recovery instructions will be sent.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="forgot-field">
            <label htmlFor="reset-email">Email address</label>

            <input
              id="reset-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);

                if (fieldError) {
                  setFieldError("");
                }

                if (
                  recoveryState !== RECOVERY_STATES.IDLE
                ) {
                  setRecoveryState(RECOVERY_STATES.IDLE);
                }
              }}
              onBlur={() => {
                if (email.trim()) {
                  validateEmail();
                }
              }}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={
                fieldError
                  ? "reset-email-error forgot-email-help"
                  : "forgot-email-help"
              }
              disabled={isLoading}
            />

            <p
              id="forgot-email-help"
              className="forgot-field-help"
            >
              Use the email address you normally use to sign in.
            </p>

            {fieldError && (
              <p
                id="reset-email-error"
                className="forgot-message forgot-message--error"
                role="alert"
              >
                {fieldError}
              </p>
            )}
          </div>

          {recoveryState === RECOVERY_STATES.SUCCESS && (
            <div
              className="forgot-message forgot-message--success"
              role="status"
              aria-live="polite"
            >
              If an account is associated with this email address,
              password recovery instructions will be sent. Check your
              inbox and spam folder before trying again.
            </div>
          )}

          {recoveryState ===
            RECOVERY_STATES.RATE_LIMITED && (
            <div
              className="forgot-message forgot-message--warning"
              role="alert"
            >
              Too many recovery requests were submitted. Please wait
              before trying again.
            </div>
          )}

          {recoveryState === RECOVERY_STATES.ERROR && (
            <div
              className="forgot-message forgot-message--error"
              role="alert"
            >
              Password recovery is temporarily unavailable. Please
              try again later.
            </div>
          )}

          <button
            type="submit"
            className="forgot-btn"
            disabled={isLoading}
          >
            {isLoading
              ? "Sending recovery instructions…"
              : "Send recovery instructions"}
          </button>
        </form>

        <button
          type="button"
          className="back-login-btn"
          onClick={() => setPage("login")}
          disabled={isLoading}
        >
          Back to Login
        </button>
      </section>
    </main>
  );
}