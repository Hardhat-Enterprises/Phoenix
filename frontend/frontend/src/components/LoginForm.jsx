import { useState } from "react";
import { loginUser, saveAuthSession } from "../services/authApi";
import "./design.css";

export default function LoginForm({ setPage, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    if (!username.trim() || !password) {
      setErrorMessage("Enter both username and password to sign in.");
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
      setStatusMessage("Signed in successfully. Opening dashboard..."); //
      setPage("dashboard");
    } catch (error) {
      setErrorMessage(error.message);
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
          <p>Sign in to access the Phoenix monitoring dashboard.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field label-required" htmlFor="login-username">
            <span>Username or email</span>
            <input
              id="login-username"
              type="text"
              name="username"
              placeholder="Enter your username or email"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
              aria-required="true"
              aria-invalid={Boolean(errorMessage)}
              aria-describedby={errorMessage ? "login-error" : undefined}
            />
          </label>

          <label className="login-field label-required" htmlFor="login-password">
            <span>Password</span>
            <input
              id="login-password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              aria-required="true"
              aria-invalid={Boolean(errorMessage)}
              aria-describedby={errorMessage ? "login-error" : undefined}
            />
          </label>
      {errorMessage && (
        <p id="login-error" className="login-message login-error">
          {errorMessage}
        </p>
      )}
      {statusMessage && (
        <p id="login-status" className="login-message login-success">
          {statusMessage}
        </p>
      )}
          <div className="login-extra">
            <label className="remember">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>

            <button className="forgot" type="button" onClick={() => setPage("forgotPassword")}>
              Forgot password?
            </button>
          </div>

          <button type="submit" className="btn btn-primary login-submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="login-footer">
          <span>New to Phoenix?</span>
          <button type="button" onClick={() => setPage("about")}>Learn about the platform</button>
        </div>
      </section>
    </main>
  );
}
