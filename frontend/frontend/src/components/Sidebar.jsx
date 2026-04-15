import "./Sidebar.css";

// I created this sidebar component for the About Us page.
// My aim was to keep it close to the approved high-fidelity design.
// Only the About Us option is highlighted because that is the current page.

function Sidebar() {
  const menuItems = [
    "Dashboard",
    "Alerts",
    "About Us",
    "Threats",
    "Reports",
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
              className={`sidebar-item ${item === "About Us" ? "active" : ""}`}
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