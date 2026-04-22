import "./Sidebar.css";

function Sidebar({ setPage, page }) {
  const menuItems = [
    { label: "Dashboard", value: "dashboard" },
    { label: "Alerts", value: "alerts" },
    { label: "Threat Reports", value: "reports" },
    { label: "About Us", value: "about" },
    { label: "Settings", value: "settings" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-panel">
        <h3 className="sidebar-heading">MAIN MENU</h3>

        <div className="sidebar-menu">
          {menuItems.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`sidebar-item ${
                page === item.value ? "active" : ""
              }`}
              onClick={() => setPage(item.value)}
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