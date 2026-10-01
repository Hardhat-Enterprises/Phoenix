import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { loginUser, saveAuthSession } from "../services/authApi";
import "./design.css";

export default function LoginForm({ setPage, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    username: "",
    password: "",
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [statusKind, setStatusKind] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
    if (fieldErrors.username) {
      setFieldErrors((current) => ({ ...current, username: "" }));
    }
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
    if (fieldErrors.password) {
      setFieldErrors((current) => ({ ...current, password: "" }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setStatusMessage("");
    setStatusKind("");

    const nextErrors = {
      username: username.trim() ? "" : "Enter your username or email.",
      password: password ? "" : "Enter your password.",
    };

    setFieldErrors(nextErrors);

    if (nextErrors.username || nextErrors.password) {
      if (nextErrors.username) {
        usernameRef.current?.focus();
      } else {
        passwordRef.current?.focus();
      }
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("Signing in...");
    setStatusKind("loading");

    try {
      const session = await loginUser({
        username: username.trim(),
        password,
      });

      const savedSession = saveAuthSession(session);
      onLogin?.(savedSession);
      setStatusMessage("Signed in successfully. Opening dashboard...");
      setStatusKind("success");
      setPage("dashboard");
    } catch (error) {
      setStatusMessage(error.message);
      setStatusKind("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main id="main-content" className="login-main">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-heading">
          <span className="login-eyebrow">Secure access</span>
          <h1 id="login-title">Welcome back</h1>
          <p>Enter your username or email and password to continue.</p>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
          noValidate
          aria-busy={isSubmitting}
        >
          <div className="login-field">
            <label className="label-required" htmlFor="login-username">
              Username or email
            </label>
            <input
              ref={usernameRef}
              id="login-username"
              type="text"
              name="username"
              placeholder="Enter your username or email"
              value={username}
              onChange={handleUsernameChange}
              autoComplete="username"
              autoFocus
              required
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={
                fieldErrors.username ? "login-username-error" : undefined
              }
            />
            {fieldErrors.username && (
              <p id="login-username-error" className="login-field-error">
                {fieldErrors.username}
              </p>
            )}
          </div>

          <div className="login-field">
            <label className="label-required" htmlFor="login-password">
              Password
            </label>
            <input
              ref={passwordRef}
              id="login-password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={handlePasswordChange}
              autoComplete="current-password"
              required
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? "login-password-error" : undefined
              }
            />
            {fieldErrors.password && (
              <p id="login-password-error" className="login-field-error">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="login-extra">
            <label className="password-visibility">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              <span>Show password</span>
            </label>

            <Link className="forgot" to="/forgot-password">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={isSubmitting}
          >
            Sign in
          </button>

          <p
            id="login-status"
            className={
              statusMessage
                ? `login-message login-${statusKind}`
                : "login-status"
            }
            role="status"
          >
            {statusMessage}
          </p>
        </form>
      </section>
    </main>
  );
}
