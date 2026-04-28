import "./Sidebar.css";

function Sidebar({ setPage, page }) {
  const menuItems = [
    "Dashboard",
    "Alerts",
    "Threat Reports",
    "About Us",
    "Settings",
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-panel">
        <h3 className="sidebar-heading">MAIN MENU</h3>

        <div className="sidebar-menu">
          {menuItems.map((item) => (
            <button
              key={item}
              type="button"
              className={`sidebar-item ${
                (page === "dashboard" && item === "Dashboard") ||
                (page === "about" && item === "About Us") ||
                (page === "settings" && item === "Settings")
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                if (item === "Dashboard") setPage("dashboard");
                if (item === "About Us") setPage("about");
                if (item === "Settings") setPage("settings");
              }}
            >
              <span className="sidebar-icon"></span>
              <span className="sidebar-text">{item}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;