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
        <span
          className="forgot"
          onClick={() => setPage("forgotPassword")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
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

      <div
        onClick={() => setPage("about")}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setPage("about");
        }}
        style={{
          marginTop: "24px",
          border: "1px solid #d0d7e3",
          borderRadius: "12px",
          padding: "14px 16px",
          background: "#ffffff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          transition: "box-shadow 0.2s, transform 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.12)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <img
          src="https://placehold.co/52x52/f1f5fb/10254d?text=PX"
          alt="Phoenix logo"
          style={{
            borderRadius: "10px",
            width: "52px",
            height: "52px",
            flexShrink: 0,
          }}
        />
        <div style={{ textAlign: "left" }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "#11264d" }}>
            About PHOENIX
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#4b5d7a", lineHeight: 1.5 }}>
            PHOENIX supports disaster management by combining hazard monitoring,
            cyber threat visibility, and alert based insights in a single
            dashboard. Its purpose is to improve awareness of physical and
            digital risks during disaster events.
          </p>
        </div>
      </div>

    </div>
  );
}