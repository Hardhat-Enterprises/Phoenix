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
import { HOME_PATH, pathForKey, routeForPath } from "./config/routes";

// Pages the Back action should never return the user to.
const NON_RETURNABLE_PAGES = [
  PAGE_KEYS.LOGIN,
  PAGE_KEYS.FORGOT_PASSWORD,
  PAGE_KEYS.THREATS,
];

function App() {
  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [previousPage, setPreviousPage] = useState(APP_CONFIG.defaultPage);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const adminMenuRef = useRef(null);
  const menuButtonRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  const mainPages = MAIN_PAGE_KEYS;

  // The "current page key" derived from the real URL — this is what replaces
  // the old `page` state now that the browser URL is the source of truth.
  const currentPageKey = routeForPath(location.pathname)?.key;
  const showChrome = mainPages.includes(currentPageKey);

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

  // Single navigation entry point, now backed by real URLs. Kept as a
  // `setPage`-style function taking a PAGE_KEYS key so LoginForm,
  // ForgotPassword, CreateUser, Dashboard, Alerts, RiskAssessmentPage and
  // SettingsPage — none of which know about react-router — don't need to
  // change at all.
  const goToPage = (nextKey) => {
    if (!nextKey || nextKey === currentPageKey) {
      return;
    }

    setPreviousPage(currentPageKey);
    navigate(pathForKey(nextKey));
  };

  // Back from Threat Details uses the page-key history we track ourselves
  // (browser history alone isn't reliable here, since the user may have
  // arrived via a direct link or a refresh).
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
                          +
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
                          &rarr;
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
            </button>
          )}
        </div>
      </div>

      {showNotifPanel && (
        <NotificationPanel onClose={() => setShowNotifPanel(false)} />
      )}

      <div className="page-content">
        <Routes>
          <Route path="/" element={<Navigate to={HOME_PATH} replace />} />

          <Route
            path={pathForKey(PAGE_KEYS.LOGIN)}
            element={<LoginForm setPage={goToPage} onLogin={handleLogin} />}
          />

          <Route
            path={pathForKey(PAGE_KEYS.FORGOT_PASSWORD)}
            element={<ForgotPassword setPage={goToPage} />}
          />

          <Route
            path={pathForKey(PAGE_KEYS.CREATE_USER)}
            element={
              isAdmin ? (
                <CreateUser
                  setPage={goToPage}
                  currentUserRole={authSession?.user?.role}
                />
              ) : (
                <Navigate to={HOME_PATH} replace />
              )
            }
          />

          <Route
            path={pathForKey(PAGE_KEYS.DASHBOARD)}
            element={withShell(
              <Dashboard
                setPage={goToPage}
                setSelectedThreat={setSelectedThreat}
                isLoggedIn={isLoggedIn}
              />,
            )}
          />

          <Route
            path={pathForKey(PAGE_KEYS.ALERTS)}
            element={withShell(
              <Alerts setPage={goToPage} setSelectedThreat={setSelectedThreat} />,
            )}
          />

          <Route path={pathForKey(PAGE_KEYS.ABOUT)} element={withShell(<AboutUs />)} />

          <Route path={pathForKey(PAGE_KEYS.REPORTS)} element={withShell(<ReportsPage />)} />

          <Route
            path={pathForKey(PAGE_KEYS.THREATS)}
            element={withShell(
              <ThreatDetails
                selectedThreat={selectedThreat}
                onBack={handleBackFromThreatDetails}
              />,
            )}
          />

          <Route
            path={pathForKey(PAGE_KEYS.RISK_ASSESSMENT)}
            element={withShell(<RiskAssessmentPage />)}
          />

          <Route
            path={pathForKey(PAGE_KEYS.SETTINGS)}
            element={withShell(
              <SettingsPage
                setPage={goToPage}
                authSession={authSession}
                onLogout={handleLogout}
              />,
            )}
          />

          <Route path="/help" element={withShell(<HelpSupportPage />)} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      <Footer />
    </div>
  );
}

export default App;
