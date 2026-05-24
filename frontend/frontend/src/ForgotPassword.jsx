export default function ForgotPassword({ setPage }) {
  return (
    <div className="forgot-page-wrapper">
      <div className="forgot-password-card">
        <h2>Forgot Password</h2>
        <p className="forgot-subtext">
          Enter your username or email and we will send a password reset link.
        </p>

        <label htmlFor="reset-email">Username or Email</label>
        <input
          id="reset-email"
          type="text"
          placeholder="Enter your username or email"
        />

        <button type="button" className="forgot-btn">
          Send Password Reset
        </button>

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