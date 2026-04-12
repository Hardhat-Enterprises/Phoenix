export default function LoginForm() {
  return (
    <div className="login-form">
      <label>Username or Email</label>
      <input type="text" placeholder="Enter your username or email" />

      <label>Password</label>
      <input type="password" placeholder="Enter your password" />

      <button type="button">Sign In</button>

      {/* NEW PART */}
      <div className="login-extra">
        <span className="forgot">Forgotten Password?</span>

        <label className="remember">
          <input type="checkbox" />
          Remember Me
        </label>
      </div>
    </div>
  );
}