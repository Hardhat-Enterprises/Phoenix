import { useEffect, useRef, useState } from "react";
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
import CreateUser from "./CreateUser";
import HelpSupportPage from "./HelpSupportPage";


// Pages the Back action should never return the user to.
const NON_RETURNABLE_PAGES = ["login", "forgotPassword", "threats"];

function App() {
  const [page, setPage] = useState("dashboard");
  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [previousPage, setPreviousPage] = useState("dashboard");
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [siteSearch, setSiteSearch] = useState("");
  const [helpSearchQuery, setHelpSearchQuery] = useState("");
  const adminMenuRef = useRef(null);

  const mainPages = [
    "about",
    "dashboard",
    "reports",
    "alerts",
    "threats",
    "settings",
    "riskAssessment",
    "help",
  ];

  // Page names the header search recognises for direct navigation. Any other
  // query opens Help & Support with the query applied to the help search.
  const searchablePages = {
    dashboard: "dashboard",
    home: "dashboard",
    alerts: "alerts",
    reports: "reports",
    about: "about",
    "about us": "about",
    settings: "settings",
    threats: "threats",
    "threat details": "threats",
    "risk assessment": "riskAssessment",
    help: "help",
    support: "help",
    "help & support": "help",
    faq: "help",
  };

  const isLoggedIn = Boolean(authSession?.accessToken);

  const isAdmin = authSession?.user?.role?.toLowerCase() === "admin";

  useEffect(() => {
    if (!showAdminMenu) return undefined;

    const closeMenu = (event) => {
      if (!adminMenuRef.current?.contains(event.target)) setShowAdminMenu(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowAdminMenu(false);
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showAdminMenu]);

  // Single navigation entry point. Records the page being left so that the
  // Threat Details page can offer a Back action that returns there.
  const goToPage = (nextPage) => {
    if (!nextPage || nextPage === page) {
      return;
    }

    setPreviousPage(page);
    setPage(nextPage);
  };

  // Header site search: exact page names navigate directly; anything else
  // opens Help & Support with the query applied to the help topic search.
  const submitSiteSearch = () => {
    const query = siteSearch.trim();

    if (!query) {
      return;
    }

    const pageTarget = searchablePages[query.toLowerCase()];

    if (pageTarget) {
      goToPage(pageTarget);
    } else {
      setHelpSearchQuery(query);
      goToPage("help");
    }

    setSiteSearch("");
  };

  const handleBackFromThreatDetails = () => {
    setSelectedThreat(null);
    goToPage(
      NON_RETURNABLE_PAGES.includes(previousPage) ? "dashboard" : previousPage,
    );
  };

  const handleLogin = (session) => {
    setAuthSession(session);
    goToPage("dashboard");
  };

  const handleLogout = async (nextPage = "dashboard") => {
    setShowAdminMenu(false);
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
                aria-label="Search in site"
                value={siteSearch}
                onChange={(event) => setSiteSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitSiteSearch();
                  }
                }}
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
              {isAdmin ? (
                <div className="admin-menu-container" ref={adminMenuRef}>
                  <button
                    type="button"
                    className="header-role header-role-button"
                    aria-haspopup="menu"
                    aria-expanded={showAdminMenu}
                    onClick={() => setShowAdminMenu((visible) => !visible)}
                  >
                    Admin <span aria-hidden="true">⌄</span>
                  </button>
                  {showAdminMenu && (
                    <div className="admin-menu" role="menu">
                      <button type="button" role="menuitem" onClick={() => { setShowAdminMenu(false); goToPage("createUser"); }}>
                        <span className="admin-menu-icon" aria-hidden="true">＋</span>
                        <span><strong>Create user</strong><small>Add a dashboard or app account</small></span>
                      </button>
                      <button type="button" role="menuitem" className="admin-menu-logout" onClick={() => handleLogout()}>
                        <span className="admin-menu-icon" aria-hidden="true">↪</span>
                        <span><strong>Logout</strong><small>End your current session</small></span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <span className="header-role">{authSession?.user?.role || "user"}</span>
                  <button type="button" className="header-auth-button" onClick={() => handleLogout()}>Logout</button>
                </>
              )}
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
        <NotificationPanel onClose={() => setShowNotifPanel(false)} />
      )}

      <div className="page-content">
        {page === "login" && (
          <LoginForm setPage={goToPage} onLogin={handleLogin} />
        )}

        {page === "forgotPassword" && <ForgotPassword setPage={goToPage} />}

        {page === "createUser" && isAdmin && (
          <CreateUser setPage={goToPage} />
        )}

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
            <Sidebar setPage={goToPage} page={page} />
            <RiskAssessmentPage />
          </div>
        )}

        {page === "help" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={goToPage} page={page} />
            {/* Keyed by the query so a new header search re-applies it. */}
            <HelpSupportPage
              key={helpSearchQuery}
              setPage={goToPage}
              searchQuery={helpSearchQuery}
            />
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
