export default function ForgotPassword({ setPage }) {
  return (
    <div className="forgot-page-wrapper">
      <div className="forgot-password-card">
        <h2>Forgot Password</h2>
        <p className="forgot-subtext">
          Enter your username or email and we will send a password reset link.
        </p>

        <label htmlFor="reset-email" className="label-required">Username or Email</label>
        <input
          id="reset-email"
          type="text"
          placeholder="Enter your username or email"
          aria-required="true"
        />

        <button type="button" className="btn btn-primary" >
          Send Password Reset
        </button>

        <button
          type="button"
          className="btn"
          onClick={() => setPage("login")}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}