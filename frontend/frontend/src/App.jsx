import { useState } from "react";
import LoginForm from "./components/LoginForm";
import "./App.css";
import AboutUs from "./AboutUs";
import Dashboard from "./Dashboard";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import ForgotPassword from "./ForgotPassword";
import SettingsPage from "./SettingsPage";
import Alerts from "./Alerts";
import ReportsPage from "./ReportsPage";
import ThreatDetails from "./ThreatDetails";
import { logoutUser } from "./services/authApi";
import RiskCorrelation from "./components/RiskCorrelation";



function App() {
  const [page, setPage] = useState("dashboard");
  const [authSession, setAuthSession] = useState(null);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const mainPages = [
  "about",
  "dashboard",
  "reports",
  "alerts",
  "threats",
  "settings",
  "risk",
];
  const isLoggedIn = Boolean(authSession?.accessToken);

  const handleLogin = (session) => {
    setAuthSession(session);
    setPage("dashboard");
  };

  const handleLogout = async () => {
    await logoutUser();
    setAuthSession(null);
    setPage("dashboard");
  };

  return (
    <div className="login-page">
      <div className="temp-header">
        <div className="temp-header-left">
          <div className="temp-logo">
            <img src="/logo.png" alt="Phoenix logo" />
          </div>

          <div>
            <h2>Phoenix</h2>
            <p>Disaster and Cyber Risk Monitoring Dashboard</p>
          </div>
        </div>

        <div className="temp-header-right">
          {mainPages.includes(page) && (
            <>
              <input
                type="text"
                placeholder="Search in site"
                className="temp-search"
              />

              <button className="temp-bell" aria-label="Notifications">
                !
              </button>
            </>
          )}

          {isLoggedIn ? (
            <div className="header-auth-summary">
              <span className="header-role">{authSession.user?.role || "user"}</span>
              <button
                type="button"
                className="header-auth-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="header-auth-button"
              onClick={() => setPage("login")}
            >
              Login
            </button>
          )}
        </div>
      </div>

      <div className="page-content">
        {page === "login" && (
          <LoginForm setPage={setPage} onLogin={handleLogin} />
        )}

        {page === "forgotPassword" && <ForgotPassword setPage={setPage} />}

        {page === "dashboard" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <Dashboard
              setPage={setPage}
              setSelectedThreat={setSelectedThreat}
            />
          </div>
        )}

        {page === "alerts" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <Alerts
              setPage={setPage}
              setSelectedThreat={setSelectedThreat}
            />
          </div>
        )}

        {page === "about" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <AboutUs />
          </div>
        )}

        {page === "reports" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <ReportsPage />
          </div>
        )}

        {page === "threats" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <ThreatDetails selectedThreat={selectedThreat} />
          </div>
        )}

        {page === "settings" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <SettingsPage setPage={setPage} />
          </div>
        )}
        {page === "risk" && (
  <div style={{ display: "flex", width: "100%" }}>
    <Sidebar setPage={setPage} page={page} />

    <div style={{ flex: 1, width: "100%" }}>
      <RiskCorrelation />
    </div>
  </div>
)}
      </div>

      <Footer />
    </div>
  );
}

export default App;
