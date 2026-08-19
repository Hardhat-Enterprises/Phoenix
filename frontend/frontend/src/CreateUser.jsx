import { useMemo, useState } from "react";
import { registerUser, getSafeAuthErrorMessage } from "./services/authApi";
import "./AuthForms.css";

const initialForm = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "user",
};

const ROLE_DESCRIPTIONS = {
  user: "Standard access to the dashboard, alerts, reports and settings.",
  analyst: "Adds access to threat and hazard detail views for investigation work.",
  admin: "Full access, including the ability to create and manage other accounts.",
};

// Simple heuristic strength check — not a security control on its own, just
// guidance so people don't pick an 8-character password and call it done.
function evaluatePasswordStrength(password) {
  if (!password) {
    return { score: 0, label: "", tier: "" };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score, label: "Weak", tier: "weak" };
  if (score <= 3) return { score, label: "Medium", tier: "medium" };
  return { score, label: "Strong", tier: "strong" };
}

function isEmailFormat(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUsernameFormat(value) {
  return /^[a-zA-Z0-9_.-]{3,32}$/.test(value);
}

const isDirty = (form) =>
  Object.entries(form).some(([key, value]) => value !== initialForm[key]);

/**
 * @param {object} props
 * @param {(page: string) => void} props.setPage
 * @param {string} [props.currentUserRole] - pass authSession.user.role from
 *   App.jsx. Defaults to "user" (i.e. denied) so this page fails closed if
 *   the caller forgets to wire the prop.
 */
export default function CreateUser({ setPage, currentUserRole = "user" }) {
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState("form"); // form | review
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const strength = useMemo(() => evaluatePasswordStrength(form.password), [form.password]);

  const isAdmin = currentUserRole === "admin";

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((current) => ({ ...current, [name]: undefined }));
    }
  };

  const validate = () => {
    const errors = {};

    if (!form.username.trim()) {
      errors.username = "Username is required.";
    } else if (!isUsernameFormat(form.username.trim())) {
      errors.username = "Use 3–32 characters: letters, numbers, underscores, dots or hyphens.";
    }

    if (!form.email.trim()) {
      errors.email = "Email is required.";
    } else if (!isEmailFormat(form.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    if (!form.password) {
      errors.password = "Temporary password is required.";
    } else if (form.password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = "Confirm the password.";
    } else if (form.confirmPassword !== form.password) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goToReview = (event) => {
    event.preventDefault();
    setErrorMessage("");
    if (!validate()) {
      return;
    }
    setStep("review");
  };

  const backToForm = () => {
    setStep("form");
  };

  const confirmCreate = async () => {
    setErrorMessage("");
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
      setForm(initialForm); // clears the password fields too
      setStep("form");
    } catch (error) {
      setErrorMessage(
        getSafeAuthErrorMessage(
          error,
          "Something went wrong creating the account. Please try again.",
        ),
      );
      setStep("form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (isDirty(form)) {
      setConfirmingDiscard(true);
      return;
    }
    setPage("dashboard");
  };

  const discardAndLeave = () => {
    setForm(initialForm);
    setConfirmingDiscard(false);
    setPage("dashboard");
  };

  if (!isAdmin) {
    return (
      <main className="auth-denied-page">
        <div className="auth-denied-card">
          <h2>Admin access required</h2>
          <p>Only administrators can create new user accounts.</p>
          <button
            type="button"
            className="create-user-back"
            onClick={() => setPage("dashboard")}
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  const showMatchHint = form.confirmPassword.length > 0;
  const passwordsMatch = form.confirmPassword === form.password;

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
            className="create-user-back"
            onClick={handleCancelClick}
          >
            Cancel
          </button>
        </div>

        {confirmingDiscard && (
          <div className="auth-discard-row" role="alertdialog" aria-label="Discard unsaved changes">
            <p>Discard this form? Anything entered will be lost.</p>
            <button type="button" className="auth-btn-secondary" onClick={() => setConfirmingDiscard(false)}>
              Keep editing
            </button>
            <button type="button" className="auth-btn-danger" onClick={discardAndLeave}>
              Discard
            </button>
          </div>
        )}

        {errorMessage && (
          <p className="login-message login-error" role="alert">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p className="login-message login-success" role="status">
            {successMessage}
          </p>
        )}

        {step === "form" && (
          <form className="create-user-form" onSubmit={goToReview} noValidate>
            <label htmlFor="new-username">
              Username<span className="auth-required-indicator">*</span>
            </label>
            <input
              id="new-username"
              name="username"
              value={form.username}
              onChange={updateField}
              autoComplete="off"
              required
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? "new-username-error" : undefined}
            />
            {fieldErrors.username && (
              <p className="auth-field-error" id="new-username-error" role="alert">
                {fieldErrors.username}
              </p>
            )}

            <label htmlFor="new-email">
              Email<span className="auth-required-indicator">*</span>
            </label>
            <input
              id="new-email"
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              autoComplete="off"
              required
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "new-email-error" : undefined}
            />
            {fieldErrors.email && (
              <p className="auth-field-error" id="new-email-error" role="alert">
                {fieldErrors.email}
              </p>
            )}

            <label htmlFor="new-password">
              Temporary password<span className="auth-required-indicator">*</span>
            </label>
            <div className="auth-password-row">
              <input
                id="new-password"
                className="auth-password-input"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={updateField}
                autoComplete="new-password"
                minLength={8}
                required
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby="new-password-strength"
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
            {form.password && (
              <>
                <div className="auth-strength-meter" aria-hidden="true">
                  {[1, 2, 3].map((bar) => (
                    <span
                      key={bar}
                      className={`auth-strength-bar ${
                        strength.score >= bar * (5 / 3) ? `filled ${strength.tier}` : ""
                      }`}
                    />
                  ))}
                </div>
                <p
                  className={`auth-strength-label ${strength.tier}`}
                  id="new-password-strength"
                >
                  {strength.label} password
                </p>
              </>
            )}
            <p className="auth-strength-hint">
              Use 12+ characters with a mix of upper/lowercase letters, numbers, and symbols for a stronger password.
            </p>
            {fieldErrors.password && (
              <p className="auth-field-error" role="alert">
                {fieldErrors.password}
              </p>
            )}

            <label htmlFor="confirm-password">
              Confirm password<span className="auth-required-indicator">*</span>
            </label>
            <div className="auth-password-row">
              <input
                id="confirm-password"
                className="auth-password-input"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={updateField}
                autoComplete="new-password"
                required
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : "confirm-password-match"}
              />
              <button
                type="button"
                className="auth-toggle-visibility"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
            {showMatchHint && (
              <p
                className={`auth-match-hint ${passwordsMatch ? "match" : "mismatch"}`}
                id="confirm-password-match"
                role="status"
              >
                {passwordsMatch ? "Passwords match" : "Passwords do not match"}
              </p>
            )}
            {fieldErrors.confirmPassword && (
              <p className="auth-field-error" id="confirm-password-error" role="alert">
                {fieldErrors.confirmPassword}
              </p>
            )}

            <label htmlFor="new-role">Role</label>
            <select id="new-role" name="role" value={form.role} onChange={updateField}>
              <option value="user">User</option>
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
            </select>
            <p className="auth-role-description">{ROLE_DESCRIPTIONS[form.role]}</p>

            <button type="submit" className="create-user-submit">
              Review and create
            </button>
          </form>
        )}

        {step === "review" && (
          <div>
            <div className="auth-review-list">
              <div className="auth-review-row">
                <span>Username</span>
                <span>{form.username}</span>
              </div>
              <div className="auth-review-row">
                <span>Email</span>
                <span>{form.email}</span>
              </div>
              <div className="auth-review-row">
                <span>Temporary password</span>
                <span>{"•".repeat(form.password.length)}</span>
              </div>
              <div className="auth-review-row">
                <span>Role</span>
                <span>{form.role} — {ROLE_DESCRIPTIONS[form.role]}</span>
              </div>
            </div>

            <div className="auth-review-actions">
              <button type="button" className="auth-btn-secondary" onClick={backToForm} disabled={isSubmitting}>
                Edit
              </button>
              <button
                type="button"
                className="create-user-submit"
                onClick={confirmCreate}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting && <span className="auth-submit-spinner" aria-hidden="true" />}
                {isSubmitting ? "Creating user..." : "Confirm and create"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
