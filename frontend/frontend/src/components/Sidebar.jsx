import { NavLink } from "react-router-dom";
import { sidebarRoutes } from "../config/routes";
import "./Sidebar.css";

function Sidebar({ isAdmin = false, onNavigate }) {
  const menuItems = sidebarRoutes({ isAdmin });

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