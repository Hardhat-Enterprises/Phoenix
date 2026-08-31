import { useCallback, useEffect, useRef, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import "./App.css";
import "./components/design.css";
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
import ComponentShowcase from "./components/ComponentShowcase";
import GlobalSearch from "./components/GlobalSearch";
import { usePreferences } from "./PreferencesContext";
import IntegrationHealthPanel from "./components/IntegrationHealthPanel";
import {
  HOME_PATH,
  pathForKey,
  routeForPath,
  APP_NAME,
} from "./config/routes";

// Pages that show the header search and notification bell.
const MAIN_PATHS = [
  "/dashboard",
  "/alerts",
  "/reports",
  "/about",
  "/settings",
  "/threats",
  "/risk-assessment",
  "/help",
  "/admin/integration-health",
];

const UNSAVED_SETTINGS_MESSAGE =
  "You have unsaved theme changes. Leave Settings without saving them?";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { preferences } = usePreferences();

  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);
  const [page, setPage] = useState(null);
  const adminMenuRef = useRef(null);
  const notifBellRef = useRef(null);
  const menuButtonRef = useRef(null);
  const hasUnsavedSettingsRef = useRef(false);

  const isLoggedIn = Boolean(authSession?.accessToken);
  const isAdmin = authSession?.user?.role?.toLowerCase() === "admin";
  const showChrome =
    MAIN_PATHS.includes(location.pathname) ||
    location.pathname.startsWith("/threats/");

  const updateUnsavedSettings = useCallback((hasUnsavedChanges) => {
    const nextValue = Boolean(hasUnsavedChanges);
    hasUnsavedSettingsRef.current = nextValue;
    setHasUnsavedSettings(nextValue);
  }, []);

  const confirmSettingsNavigation = useCallback((nextPath) => {
    if (
      !hasUnsavedSettingsRef.current
      || nextPath === location.pathname
    ) {
      return true;
    }

    if (!window.confirm(UNSAVED_SETTINGS_MESSAGE)) return false;

    updateUnsavedSettings(false);
    return true;
  }, [location.pathname, updateUnsavedSettings]);

  // Compatibility shim: teammates' pages still call setPage("dashboard").
  // Translate those keys into real navigation so their code keeps working.
  const goToPage = (key) => {
    const nextPath = pathForKey(key);
    if (!confirmSettingsNavigation(nextPath)) return false;

    setPage(key);
    navigate(nextPath);
    return true;
  };

  // Browser tab title follows the current route.
  useEffect(() => {
    const route = routeForPath(location.pathname);

    document.title = `${
      route ? route.title : "Page not found"
    } | ${APP_NAME}`;
  }, [location.pathname]);

  useEffect(() => {
    const browserNavigation = window.navigation;
    if (!hasUnsavedSettings || !browserNavigation?.addEventListener) {
      return undefined;
    }

    const warnBeforeSameDocumentNavigation = (event) => {
      if (!event.destination?.sameDocument) return;

      const destinationPath = new URL(event.destination.url).pathname;
      if (
        !confirmSettingsNavigation(destinationPath)
        && event.cancelable
      ) {
        event.preventDefault();
      }
    };

    browserNavigation.addEventListener(
      "navigate",
      warnBeforeSameDocumentNavigation,
    );
    return () => browserNavigation.removeEventListener(
      "navigate",
      warnBeforeSameDocumentNavigation,
    );
  }, [confirmSettingsNavigation, hasUnsavedSettings]);

  // Escape closes the mobile menu and returns focus to the menu button.
  useEffect(() => {
    if (!sidebarOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!showAdminMenu) {
      return undefined;
    }

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

  // Closing the panel hands focus back to the bell that opened it.
  const closeNotificationPanel = () => {
    setShowNotifPanel(false);
    notifBellRef.current?.focus();
  };

  const handleBackFromThreatDetails = () => {
    setSelectedThreat(null);

    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(HOME_PATH);
    }
  };

  const handleLogin = (session) => {
    setAuthSession(session);
    navigate(HOME_PATH);
  };

  const handleLogout = async (nextPage = "dashboard") => {
    if (
      preferences.confirmImportantActions
      && !window.confirm(
        nextPage === "login"
          ? "Change user and end the current session?"
          : "Sign out and end the current session?",
      )
    ) {
      return false;
    }

    if (!confirmSettingsNavigation(pathForKey(nextPage))) return false;

    setShowAdminMenu(false);
    await logoutUser();
    setAuthSession(null);
    goToPage(nextPage);
    return true;
  };

  // Closes the mobile drawer and returns focus to the button that opened it.
  // Sidebar calls this after every link click, so the drawer closes on
  // navigation without needing an effect that watches the route.
  const closeSidebar = () => {
    setSidebarOpen(false);
    menuButtonRef.current?.focus();
  };

  // The shared shell: header, Sidebar, page content, Footer.
  // Replaces the repeated display:flex wrappers.
  const withShell = (content) => (
    <div className={`app-body${sidebarOpen ? " sidebar-open" : ""}`}>
      <Sidebar
        isAdmin={isAdmin}
        onNavigate={closeSidebar}
        onBeforeNavigate={confirmSettingsNavigation}
      />
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

  // Admin-only routes redirect anyone else to the dashboard.
  const adminOnly = (content) =>
    isAdmin ? content : <Navigate to={HOME_PATH} replace />;

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
            aria-label={
              sidebarOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <span aria-hidden="true">
              {sidebarOpen ? "\u2715" : "\u2630"}
            </span>
          </button>

          <Link
            to={HOME_PATH}
            className="temp-logo logo-home-button"
            aria-label="Phoenix home, go to Dashboard"
            title="Go to Dashboard"
            onClick={(event) => {
              if (!confirmSettingsNavigation(HOME_PATH)) {
                event.preventDefault();
              }
            }}
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
              <GlobalSearch isAdmin={isAdmin} />

              <button
                type="button"
                className="temp-bell"
                aria-label="Notifications"
                aria-haspopup="dialog"
                aria-expanded={showNotifPanel}
                onClick={() =>
                  showNotifPanel
                    ? closeNotificationPanel()
                    : setShowNotifPanel(true)
                }
                ref={notifBellRef}
              >
                <svg
                  className="temp-bell-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M12 3a5.5 5.5 0 0 0-5.5 5.5v3.2L5 15.2a.8.8 0 0 0 .7 1.2h12.6a.8.8 0 0 0 .7-1.2l-1.5-3.5V8.5A5.5 5.5 0 0 0 12 3Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 18.4a2.1 2.1 0 0 0 4 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </>
          )}

          {isLoggedIn ? (
            <div className="header-auth-summary">
              {isAdmin ? (
                <div
                  className="admin-menu-container"
                  ref={adminMenuRef}
                >
                  <button
                    type="button"
                    className="header-role header-role-button"
                    aria-haspopup="menu"
                    aria-expanded={showAdminMenu}
                    onClick={() =>
                      setShowAdminMenu((visible) => !visible)
                    }
                  >
                    Admin{" "}
                    <span aria-hidden="true">
                      {"\u2304"}
                    </span>
                  </button>

                  {showAdminMenu && (
                    <div className="admin-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowAdminMenu(false);
                          goToPage("createUser");
                        }}
                      >
                        <span className="admin-menu-icon" aria-hidden="true">
                          {"\uFF0B"}
                        </span>

                        <span>
                          <strong>Create user</strong>
                          <small>
                            Add a dashboard or app account
                          </small>
                        </span>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowAdminMenu(false);
                          goToPage("integrationHealth");
                        }}
                      >
                        <span
                          className="admin-menu-icon"
                          aria-hidden="true"
                        >
                          ◉
                        </span>

                        <span>
                          <strong>Integration health</strong>
                          <small>
                            Check backend service availability
                          </small>
                        </span>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowAdminMenu(false);
                          goToPage("componentShowcase");
                        }}
                      >
                        <span
                          className="admin-menu-icon"
                          aria-hidden="true"
                        >
                          ↪
                        </span>

                        <span>
                          <strong>Component showcase</strong>
                          <small>Internal design tokens and examples</small>
                          <strong>Logout</strong>
                          <small>
                            End your current session
                          </small>
                        </span>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className="admin-menu-logout"
                        onClick={() => handleLogout()}
                      >
                        <span aria-hidden="true">
                          component-showcase
                        </span>

                        <span>
                          <strong>Component showcase</strong>
                          <small>
                            Internal design tokens & examples
                          </small>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
          ) : (
            <Link to={pathForKey("login")} className="header-auth-button">
              Login
            </Link>
          )}
        </div>
      </div>

      {showNotifPanel && (
        <NotificationPanel onClose={closeNotificationPanel} />
      )}

      <div className="page-content">
        <Routes>
          <Route
            path="/"
            element={<Navigate to={HOME_PATH} replace />}
          />

          <Route
            path="/login"
            element={
              <LoginForm
                setPage={goToPage}
                onLogin={handleLogin}
              />
            }
          />

          <Route
            path="/forgot-password"
            element={
              <ForgotPassword setPage={goToPage} />
            }
          />

          <Route
            path="/admin/create-user"
            element={adminOnly(<CreateUser setPage={goToPage} />)}
          />

          <Route
            path="/admin/component-showcase"
            element={adminOnly(withShell(<ComponentShowcase />))}
          />

          {/* Admin-only backend integration diagnostics */}
          <Route
            path="/admin/integration-health"
            element={
              isAdmin ? (
                withShell(<IntegrationHealthPanel />)
              ) : (
                <Navigate to={HOME_PATH} replace />
              )
            }
          />

          <Route
            path="/dashboard"
            element={withShell(
              <Dashboard
                setPage={goToPage}
                setSelectedThreat={setSelectedThreat}
                isLoggedIn={isLoggedIn}
              />,
            )}
          />

          <Route
            path="/alerts"
            element={withShell(
              <Alerts
                setPage={goToPage}
                setSelectedThreat={setSelectedThreat}
              />,
            )}
          />

          <Route
            path="/about"
            element={withShell(<AboutUs />)}
          />

          <Route
            path="/reports"
            element={withShell(<ReportsPage />)}
          />

          <Route
            path="/risk-assessment"
            element={withShell(<RiskAssessmentPage />)}
          />

          <Route
            path="/threats"
            element={withShell(
              <ThreatDetails
                selectedThreat={selectedThreat}
                onBack={handleBackFromThreatDetails}
              />,
            )}
          />

          <Route
            path="/threats/:threatId"
            element={withShell(
              <ThreatDetails
                selectedThreat={selectedThreat}
                onBack={handleBackFromThreatDetails}
              />,
            )}
          />

          <Route
            path="/settings"
            element={withShell(
              <SettingsPage
                setPage={goToPage}
                authSession={authSession}
                onLogout={handleLogout}
                onUnsavedChanges={updateUnsavedSettings}
              />,
            )}
          />

          <Route
            path="/help"
            element={withShell(
              <HelpSupportPage setPage={goToPage} />,
            )}
          />

          <Route
            path="*"
            element={
              <div className="not-found">
                <h1>Page not found</h1>

                <p>
                  The address you entered does not match any Phoenix
                  page.
                </p>

                <Link
                  to={HOME_PATH}
                  className="header-auth-button"
                >
                  Return to Dashboard
                </Link>
              </div>
            }
          />
        </Routes>

        {page === "component-showcase" && isAdmin && (
          <div style={{ display: "flex" }}>
            <Sidebar
              setPage={goToPage}
              page={page}
            />
            <ComponentShowcase />
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default App;