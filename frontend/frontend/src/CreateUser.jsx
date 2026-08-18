import { useState } from "react";
import { registerUser } from "./services/authApi";
import "./components/design.css";

const initialForm = { username: "", email: "", password: "", role: "user" };

export default function CreateUser({ setPage }) {
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const result = await registerUser({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      setSuccessMessage(
        `${result.message}. ${result.user.username} can now sign in.`,
      );
      setForm(initialForm);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="create-user-page">
      <section className="create-user-card" aria-labelledby="create-user-title">
        <div className="create-user-heading">
          <div>
            <span className="create-user-eyebrow">Admin tools</span>
            <h1 id="create-user-title">Create user</h1>
            <p>Create an account for dashboard or application access.</p>
          </div>
          <button
            type="button"
            className="btn btn-primary create-user-back"
            onClick={() => setPage("dashboard")}
          >
            Back to dashboard
          </button>
        </div>

        <form className="create-user-form" onSubmit={handleSubmit}>
          <label htmlFor="new-username" className="label-required">Username</label>
          <input
            id="new-username"
            name="username"
            value={form.username}
            onChange={updateField}
            autoComplete="off"
            required
            aria-required="true"
            aria-describedby={errorMessage ? "create-user-error" : undefined}
          />

          <label htmlFor="new-email" className="label-required">Email</label>
          <input
            id="new-email"
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            autoComplete="off"
            required
            aria-required="true"
            aria-describedby={errorMessage ? "create-user-error" : undefined}
          />

          <label htmlFor="new-password" className="label-required">Temporary password</label>
          <input
            id="new-password"
            name="password"
            type="password"
            value={form.password}
            onChange={updateField}
            autoComplete="new-password"
            minLength={8}
            required
            aria-required="true"
            aria-describedby={errorMessage ? "create-user-error" : undefined}
          />

          <label htmlFor="new-role">Role</label>
          <select
            id="new-role"
            name="role"
            value={form.role}
            onChange={updateField}
          >
            <option value="user">User</option>
            <option value="analyst">Analyst</option>
            <option value="admin">Admin</option>
          </select>

          {errorMessage && (
            <p id="create-user-error" className="login-message login-error" role="alert">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="login-message login-success" role="status">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary create-user-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating user..." : "Create user"}
          </button>
        </form>
      </section>
    </main>
  );
}
