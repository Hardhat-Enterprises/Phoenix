import { useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
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
import HelpSupportPage from "./HelpSupportPage";
import { getAuthSession, logoutUser } from "./services/authApi";
import NotificationPanel from "./components/notifier";
import CreateUser from "./CreateUser";
import NotFound from "./NotFound";

import { APP_CONFIG, PAGE_KEYS } from "./config/appConfig";
import { MAIN_PAGE_KEYS } from "./config/navigation";
import { DEFAULT_USER_ROLE, USER_ROLES } from "./config/roles";

// Pages the Back action should never return the user to.
const NON_RETURNABLE_PAGES = [
  PAGE_KEYS.LOGIN,
  PAGE_KEYS.FORGOT_PASSWORD,
  PAGE_KEYS.THREATS,
];

// Pages currently recognised by the state-based frontend navigation.
// The routing team can later connect NotFound to URL-based routing.
const KNOWN_PAGES = [
  PAGE_KEYS.LOGIN,
  PAGE_KEYS.FORGOT_PASSWORD,
  PAGE_KEYS.CREATE_USER,
  PAGE_KEYS.DASHBOARD,
  PAGE_KEYS.ALERTS,
  PAGE_KEYS.ABOUT,
  PAGE_KEYS.REPORTS,
  PAGE_KEYS.THREATS,
  PAGE_KEYS.RISK_ASSESSMENT,
  PAGE_KEYS.SETTINGS,
];

function App() {
  const [page, setPage] = useState(APP_CONFIG.defaultPage);
  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [previousPage, setPreviousPage] = useState(APP_CONFIG.defaultPage);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const adminMenuRef = useRef(null);

  const mainPages = MAIN_PAGE_KEYS;

  const isLoggedIn = Boolean(authSession?.accessToken);

  const isAdmin =
    authSession?.user?.role?.toLowerCase() === USER_ROLES.ADMIN;

  useEffect(() => {
    if (!showAdminMenu) return undefined;

    const closeMenu = (event) => {
      if (!adminMenuRef.current?.contains(event.target)) {
        setShowAdminMenu(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setShowAdminMenu(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showAdminMenu]);

  // Back from Threat Details uses real browser history, so it returns the
  // user to wherever they actually came from.
  const handleBackFromThreatDetails = () => {
    setSelectedThreat(null);

    goToPage(
      NON_RETURNABLE_PAGES.includes(previousPage)
        ? APP_CONFIG.defaultPage
        : previousPage,
    );
  };

  const handleLogin = (session) => {
    setAuthSession(session);
    goToPage(PAGE_KEYS.DASHBOARD);
  };

  const handleLogout = async (nextPage = PAGE_KEYS.DASHBOARD) => {
    setShowAdminMenu(false);
    await logoutUser();
    setAuthSession(null);
    goToPage(nextPage);
  };

  // Closes the mobile drawer and returns focus to the button that opened it.
  // Sidebar calls this after every link click, so the drawer closes on
  // navigation without needing an effect that watches the route.
  const closeSidebar = () => {
    setSidebarOpen(false);
    menuButtonRef.current?.focus();
  };

  // The shared shell: header, Sidebar, page content, Footer.
  // Replaces the seven repeated display:flex wrappers.
  const withShell = (content) => (
    <div className={`app-body${sidebarOpen ? " sidebar-open" : ""}`}>
      <Sidebar isAdmin={isAdmin} onNavigate={closeSidebar} />
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation menu"
          onClick={closeSidebar}
        />
      )}
      <main id="main-content" className="app-content" tabIndex={-1}>
        {content}
      </main>
    </div>
  );

  return (
    <div className="login-page">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <div className="temp-header">
        <div className="temp-header-left">
          <button
            type="button"
            ref={menuButtonRef}
            className="menu-button"
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <span aria-hidden="true">{sidebarOpen ? "\u2715" : "\u2630"}</span>
          </button>

          <Link
            to={HOME_PATH}
            className="temp-logo logo-home-button"
            onClick={() => goToPage(PAGE_KEYS.DASHBOARD)}
            aria-label="Phoenix home, go to Dashboard"
            title="Go to Dashboard"
          >
            <img src="/logo.png" alt="Phoenix logo" />
          </Link>

          <div>
            <h2>Phoenix</h2>
            <p>Disaster and Cyber Risk Monitoring Dashboard</p>
          </div>
        </div>

        <div className="temp-header-right">
          {showChrome && (
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
              {isAdmin ? (
                <div className="admin-menu-container" ref={adminMenuRef}>
                  <button
                    type="button"
                    className="header-role header-role-button"
                    aria-haspopup="menu"
                    aria-expanded={showAdminMenu}
                    onClick={() => setShowAdminMenu((visible) => !visible)}
                  >
                    Admin <span aria-hidden="true">{"\u2304"}</span>
                  </button>

                  {showAdminMenu && (
                    <div className="admin-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowAdminMenu(false);
                          goToPage(PAGE_KEYS.CREATE_USER);
                        }}
                      >
                        <span className="admin-menu-icon" aria-hidden="true">
                          ＋
                        </span>

                        <span>
                          <strong>Create user</strong>
                          <small>Add a dashboard or app account</small>
                        </span>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className="admin-menu-logout"
                        onClick={() => handleLogout()}
                      >
                        <span className="admin-menu-icon" aria-hidden="true">
                          ↪
                        </span>

                        <span>
                          <strong>Logout</strong>
                          <small>End your current session</small>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <span className="header-role">
                    {authSession?.user?.role || DEFAULT_USER_ROLE}
                  </span>

                  <button
                    type="button"
                    className="header-auth-button"
                    onClick={() => handleLogout()}
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="header-auth-button"
              onClick={() => goToPage(PAGE_KEYS.LOGIN)}
            >
              Login
            </Link>
          )}
        </div>
      </div>

      {showNotifPanel && (
        <NotificationPanel onClose={() => setShowNotifPanel(false)} />
      )}

      <div className="page-content">
        {page === PAGE_KEYS.LOGIN && (
          <LoginForm setPage={goToPage} onLogin={handleLogin} />
        )}

        {page === PAGE_KEYS.FORGOT_PASSWORD && (
          <ForgotPassword setPage={goToPage} />
        )}

        {page === PAGE_KEYS.CREATE_USER && isAdmin && (
          <CreateUser setPage={goToPage} />
        )}

        {page === PAGE_KEYS.DASHBOARD && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={goToPage} page={page} />

            <Dashboard
              setPage={goToPage}
              setSelectedThreat={setSelectedThreat}
              isLoggedIn={isLoggedIn}
            />
          </div>
        )}

        {page === PAGE_KEYS.ALERTS && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={goToPage} page={page} />

            <Alerts
              setPage={goToPage}
              setSelectedThreat={setSelectedThreat}
            />
          </div>
        )}

        {page === PAGE_KEYS.ABOUT && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={goToPage} page={page} />
            <AboutUs />
          </div>
        )}

        {page === PAGE_KEYS.REPORTS && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={goToPage} page={page} />
            <ReportsPage />
          </div>
        )}

        {page === PAGE_KEYS.THREATS && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={goToPage} page={page} />

            <ThreatDetails
              selectedThreat={selectedThreat}
              onBack={handleBackFromThreatDetails}
            />
          </div>
        )}

        {page === PAGE_KEYS.RISK_ASSESSMENT && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={goToPage} page={page} />
            <RiskAssessmentPage />
          </div>
        )}

        {page === PAGE_KEYS.SETTINGS && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={goToPage} page={page} />

            <SettingsPage
              setPage={goToPage}
              authSession={authSession}
              onLogout={handleLogout}
            />
          </div>
        )}

        {!KNOWN_PAGES.includes(page) && <NotFound />}
      </div>

      <Footer />
    </div>
  );
}

export default App;