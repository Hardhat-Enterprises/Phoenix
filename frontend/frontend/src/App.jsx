import { useEffect, useRef, useState } from "react";
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
import { HOME_PATH, pathForKey, routeForPath, APP_NAME } from "./config/routes";

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
];

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const adminMenuRef = useRef(null);
  const menuButtonRef = useRef(null);

  const isLoggedIn = Boolean(authSession?.accessToken);
  const isAdmin = authSession?.user?.role?.toLowerCase() === "admin";
  const showChrome =
    MAIN_PATHS.includes(location.pathname) ||
    location.pathname.startsWith("/threats/");

  // Compatibility shim: teammates' pages still call setPage("dashboard").
  // Translate those keys into real navigation so their code keeps working.
  const goToPage = (key) => navigate(pathForKey(key));

  // Browser tab title follows the current route.
  useEffect(() => {
    const route = routeForPath(location.pathname);
    document.title = `${route ? route.title : "Page not found"} | ${APP_NAME}`;
  }, [location.pathname]);

  // Escape closes the mobile menu and returns focus to the menu button.
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!showAdminMenu) return undefined;

    const closeMenu = (event) => {
      if (!adminMenuRef.current?.contains(event.target))
        setShowAdminMenu(false);
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

  // Back from Threat Details uses real browser history, so it returns the
  // user to wherever they actually came from.
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
              sidebarOpen ? "Close navigation menu" : "Open navigation menu"
            }
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <span aria-hidden="true">{sidebarOpen ? "\u2715" : "\u2630"}</span>
          </button>

          <Link
            to={HOME_PATH}
            className="temp-logo logo-home-button"
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
              <GlobalSearch isAdmin={isAdmin} />

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
                          goToPage("createUser");
                        }}
                      >
                        <span className="admin-menu-icon" aria-hidden="true">
                          {"\uFF0B"}
                        </span>
                        <span>
                          <strong>Create user</strong>
                          <small>Add a dashboard or app account</small>
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
                        <span className="admin-menu-icon" aria-hidden="true">
                          {"\u25A6"}
                        </span>
                        <span>
                          <strong>Component showcase</strong>
                          <small>Internal design tokens and examples</small>
                        </span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="admin-menu-logout"
                        onClick={() => handleLogout()}
                      >
                        <span className="admin-menu-icon" aria-hidden="true">
                          {"\u21AA"}
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
        <NotificationPanel onClose={() => setShowNotifPanel(false)} />
      )}

      <div className="page-content">
        <Routes>
          <Route path="/" element={<Navigate to={HOME_PATH} replace />} />

          <Route
            path="/login"
            element={<LoginForm setPage={goToPage} onLogin={handleLogin} />}
          />
          <Route
            path="/forgot-password"
            element={<ForgotPassword setPage={goToPage} />}
          />

          <Route
            path="/admin/create-user"
            element={adminOnly(<CreateUser setPage={goToPage} />)}
          />

          <Route
            path="/admin/component-showcase"
            element={adminOnly(withShell(<ComponentShowcase />))}
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

          <Route path="/about" element={withShell(<AboutUs />)} />
          <Route path="/reports" element={withShell(<ReportsPage />)} />
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
              />,
            )}
          />

          <Route
            path="/help"
            element={withShell(<HelpSupportPage setPage={goToPage} />)}
          />

          <Route
            path="*"
            element={
              <div className="not-found">
                <h1>Page not found</h1>
                <p>The address you entered does not match any Phoenix page.</p>
                <Link to={HOME_PATH} className="header-auth-button">
                  Return to Dashboard
                </Link>
              </div>
            }
          />
        </Routes>
      </div>

      <Footer />
    </div>
  );
}

export default App;