import "./Sidebar.css";

function Sidebar({ setPage, page }) {
  const menuItems = [
    { label: "Dashboard", target: "dashboard" },
    { label: "Alerts", target: "alerts" },
    { label: "Threat Reports", target: "reports" },
    { label: "About Us", target: "about" },
    { label: "Settings", target: "settings" },
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