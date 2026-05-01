import { useState } from "react";
import LoginForm from "./components/LoginForm";
import "./App.css";
import AboutUs from "./AboutUs";
import Dashboard from "./Dashboard";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import ForgotPassword from "./ForgotPassword";
import SettingsPage from "./SettingsPage";
import Alerts from "./Alerts";
import Reports from "./Reports";

function App() {
  const [page, setPage] = useState("login");

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

        {page === "about" && (
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

      {/* Page Content */}
      <div className="page-content">
        {/* Login / Forgot Password */}
        {page === "login" || page === "forgotPassword" ? (
          <>
            {page === "login" && (
              <LoginForm setPage={setPage} />
            )}

            {page === "forgotPassword" && (
              <ForgotPassword setPage={setPage} />
            )}
          </>
        ) : (
          /* All Sidebar pages */
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />

            <div style={{ flex: 1, padding: "20px" }}>
              {page === "dashboard" && <Dashboard />}
              {page === "alerts" && <Alerts />}
              {page === "reports" && <Reports />}
              {page === "about" && <AboutUs />}
              {page === "settings" && <SettingsPage />}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default App;