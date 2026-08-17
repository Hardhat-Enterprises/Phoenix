import { NavLink } from "react-router-dom";
import { sidebarRoutes } from "../config/routes";
import "./Sidebar.css";
import { PAGE_KEYS } from "../config/appConfig";
import { NAVIGATION_LABELS } from "../config/navigation";

function Sidebar({ setPage, page }) {
  const menuItems = [
    {
      label: NAVIGATION_LABELS.DASHBOARD,
      target: PAGE_KEYS.DASHBOARD,
    },
    {
      label: NAVIGATION_LABELS.ALERTS,
      target: PAGE_KEYS.ALERTS,
    },
    {
      label: NAVIGATION_LABELS.REPORTS,
      target: PAGE_KEYS.REPORTS,
    },
    {
      label: NAVIGATION_LABELS.ABOUT,
      target: PAGE_KEYS.ABOUT,
    },
    {
      label: NAVIGATION_LABELS.SETTINGS,
      target: PAGE_KEYS.SETTINGS,
    },
    {
      label: NAVIGATION_LABELS.THREAT_DETAILS,
      target: PAGE_KEYS.THREATS,
    },
    {
      label: NAVIGATION_LABELS.RISK_ASSESSMENT,
      target: PAGE_KEYS.RISK_ASSESSMENT,
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-panel">
        <h3 className="sidebar-heading">MAIN MENU</h3>
        <nav className="sidebar-menu" aria-label="Main menu">
          {menuItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "active" : ""}`
              }
              onClick={onNavigate}
            >
              <span className="sidebar-icon" aria-hidden="true"></span>
              <span className="sidebar-text">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export default Sidebar;