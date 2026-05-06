import { useState } from "react";
import LoginForm from "./components/LoginForm";
import "./App.css";
import AboutUs from "./AboutUs";
import Dashboard from "./Dashboard";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import ForgotPassword from "./ForgotPassword";
import SettingsPage from "./SettingsPage";
import ReportsPage from "./ReportsPage";
import Alerts from "./Alerts";

function App() {
  // Change this to "reports" or "dashboard" only for testing
  const [page, setPage] = useState("alerts");

  return (
    <div className="login-page">
      
      {/* Header */}
      <div className="temp-header">
        <div className="temp-header-left">
          <div className="temp-logo">
            <img src="/logo.png" alt="Phoenix logo" />
          </div>
          <div>
            <h2>Phoenix</h2>
            <p>Disaster and Cyber Risk Monitoring Dashboard</p>
          </div>
        </div>

        {/* Show search + bell on main pages */}
        {(page === "about" || page === "dashboard" || page === "reports" || page === "alerts") && (
          <div className="temp-header-right">
            <input
              type="text"
              placeholder="Search in site"
              className="temp-search"
            />
            <button className="temp-bell" aria-label="Notifications">
              🔔
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="page-content">

        {page === "login" && <LoginForm setPage={setPage} />}

        {page === "forgotPassword" && (
          <ForgotPassword setPage={setPage} />
        )}

        {/* Dashboard */}
        {page === "dashboard" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <Dashboard/>
          </div>
        )}
          {/* Alerts */}
        {page === "alerts" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <Alerts />
          </div>
        )}

        {/* About */}
        {page === "about" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <AboutUs />
          </div>
        )}

        {/* Reports (YOUR NEW TASK) */}
        {page === "reports" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <ReportsPage />
          </div>
        )}

        {/* Settings */}
        {page === "settings" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <SettingsPage setPage={setPage} />
          </div>
        )}

      </div>

      {/* Footer always at bottom */}
      <Footer />
    </div>
  );
}

export default App;