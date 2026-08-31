import { NavLink } from "react-router-dom";
import { sidebarRoutes } from "../config/routes";
import { usePreferences } from "../PreferencesContext";
import "./Sidebar.css";

const SIDEBAR_ICONS = {
  dashboard: "⌂",
  alerts: "▲",
  reports: "▤",
  about: "i",
  settings: "⚙",
  threats: "◆",
  riskAssessment: "◇",
  help: "?",
};

function Sidebar({ isAdmin = false, onNavigate, onBeforeNavigate }) {
  const menuItems = sidebarRoutes({ isAdmin });
  const { preferences, updateUserPreferences } = usePreferences();
  const isCollapsed = preferences.sidebarCollapsed;

  const toggleSidebar = () => {
    updateUserPreferences((currentPreferences) => ({
      sidebarCollapsed: !currentPreferences.sidebarCollapsed,
    }));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-panel">
        <div className="sidebar-heading-row">
          <h3 className="sidebar-heading">MAIN MENU</h3>
          <button
            type="button"
            className="sidebar-collapse-toggle"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            onClick={toggleSidebar}
          >
            <span aria-hidden="true">{isCollapsed ? "»" : "«"}</span>
          </button>
        </div>
        <nav className="sidebar-menu" aria-label="Main menu">
          {menuItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "active" : ""}`
              }
              onClick={(event) => {
                if (onBeforeNavigate?.(item.path) === false) {
                  event.preventDefault();
                  return;
                }
                onNavigate?.();
              }}
              aria-label={item.label}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="sidebar-icon" aria-hidden="true">
                {SIDEBAR_ICONS[item.key] || "•"}
              </span>
              <span className="sidebar-text">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export default Sidebar;
