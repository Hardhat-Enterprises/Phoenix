export default function LoginForm({ setPage }) {
  return (
    <div className="login-form">
      <label>Username or Email</label>
      <input type="text" placeholder="Enter your username or email" />

      <label>Password</label>
      <input type="password" placeholder="Enter your password" />

      <button type="button" onClick={() => setPage("dashboard")}>
        Sign In
      </button>

      <div className="login-extra">
        <span className="forgot">Forgotten Password?</span>

        <label className="remember">
          <input type="checkbox" />
          Remember Me
        </label>
      </div>

      <button onClick={() => setPage("about")}>
        About Us
      </button>
    </div>
  );
}