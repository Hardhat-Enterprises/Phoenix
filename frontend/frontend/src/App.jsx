import { useState } from "react";
import "./App.css";
import LoginForm from "./components/LoginForm";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import AboutUs from "./AboutUs";
import Dashboard from "./Dashboard";
import ForgotPassword from "./ForgotPassword";
import SettingsPage from "./SettingsPage";
import Alerts from "./Alerts";
import ReportsPage from "./ReportsPage";
import ThreatDetails from "./ThreatDetails";
import RiskAssessmentPage from "./RiskAssessmentPage";
import { getAuthSession, logoutUser } from "./services/authApi";
import NotificationPanel from "./components/notifier";
import {
  AuthenticationState,
  LoadingState,
  ErrorState,
  EmptyState,
} from "./components/States";

// Pages the Back action should never return the user to.
const NON_RETURNABLE_PAGES = ["login", "forgotPassword", "threats"];

function App() {
  const [page, setPage] = useState("dashboard");
  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [previousPage, setPreviousPage] = useState("dashboard");

  const mainPages = [
    "about",
    "dashboard",
    "reports",
    "alerts",
    "threats",
    "settings",
    "riskAssessment",
  ];

  const isLoggedIn = Boolean(authSession?.accessToken);

  // Single navigation entry point. Records the page being left so that the
  // Threat Details page can offer a Back action that returns there.
  const goToPage = (nextPage) => {
    if (!nextPage || nextPage === page) {
      return;
    }

    setPreviousPage(page);
    setPage(nextPage);
  };

  const handleBackFromThreatDetails = () => {
    goToPage(
      NON_RETURNABLE_PAGES.includes(previousPage) ? "dashboard" : previousPage,
    );
  };

  const handleLogin = (session) => {
    setAuthSession(session);
    goToPage("dashboard");
  };

  const handleLogout = async (nextPage = "dashboard") => {
    await logoutUser();
    setAuthSession(null);
    goToPage(nextPage);
  };

  return (
    <div className="login-page">
      <div className="temp-header">
        <div className="temp-header-left">
          <button
            type="button"
            className="temp-logo logo-home-button"
            onClick={() => goToPage("dashboard")}
            aria-label="Phoenix home, go to Dashboard"
            title="Go to Dashboard"
          >
            <img src="/logo.png" alt="Phoenix logo" />
          </button>

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

              <button
                className="temp-bell"
                aria-label="Notifications"
                onClick={() => setShowNotifPanel(!showNotifPanel)}
              >
                !
              </button>
            </>
          )}

          {isLoggedIn ? (
            <div className="header-auth-summary">
              <span className="header-role">
                {authSession?.user?.role || "user"}
              </span>

              <button
                type="button"
                className="header-auth-button"
                onClick={() => handleLogout()}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="header-auth-button"
              onClick={() => goToPage("login")}
            >
              Login
            </button>
          )}
        </div>
      </div>
      {showNotifPanel && (
        <NotificationPanel
          onAlert={(item) => {
            //Alter for future backend
            fetch("http://192.168.50.251:3000/alert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item),
            });

            setShowNotifPanel(false);
          }}
        />
      )}

      <div className="page-content">
        {page === "login" && (
          <LoginForm setPage={goToPage} onLogin={handleLogin} />
        )}

        {page === "forgotPassword" && <ForgotPassword setPage={goToPage} />}

        {page === "dashboard" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={goToPage} page={page} />

            <Dashboard
              setPage={goToPage}
              setSelectedThreat={setSelectedThreat}
              isLoggedIn={isLoggedIn}
            />
          </div>
        )}

        {page === "alerts" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={goToPage} page={page} />

            <Alerts setPage={goToPage} setSelectedThreat={setSelectedThreat} />
          </div>
        )}

        {page === "about" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={goToPage} page={page} />
            <AboutUs />
          </div>
        )}

        {page === "reports" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={goToPage} page={page} />
            <ReportsPage />
          </div>
        )}

        {page === "threats" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={goToPage} page={page} />
            <ThreatDetails
              selectedThreat={selectedThreat}
              onBack={handleBackFromThreatDetails}
            />
          </div>
        )}

        {page === "riskAssessment" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <RiskAssessmentPage />,
          </div>
        )}

        {page === "settings" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={goToPage} page={page} />
            <SettingsPage
              setPage={goToPage}
              authSession={authSession}
              onLogout={handleLogout}
            />
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default App;
