import { useState } from "react";
import { loginUser, saveAuthSession } from "../services/authApi";

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
      setStatusMessage("Signed in successfully. Opening dashboard...");
      setPage("dashboard");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>Username or Email</label>
      <input
        type="text"
        placeholder="Enter your username or email"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoComplete="username"
      />

      <label>Password</label>
      <input
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
      />

      {errorMessage && (
        <p className="login-message login-error">{errorMessage}</p>
      )}

      {statusMessage && (
        <p className="login-message login-success">{statusMessage}</p>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing In..." : "Sign In"}
      </button>

      <div className="login-extra">
        <span
          className="forgot"
          onClick={() => setPage("forgotPassword")}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
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

      <button type="button" onClick={() => setPage("about")}>
        About Us
      </button>
    </form>
  );
}