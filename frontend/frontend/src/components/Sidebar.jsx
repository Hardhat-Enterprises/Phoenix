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

        <div className="sidebar-menu">
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`sidebar-item ${
                page === item.target ? "active" : ""
              }`}
              onClick={() => setPage(item.target)}
            >
              <span className="sidebar-icon"></span>
              <span className="sidebar-text">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;