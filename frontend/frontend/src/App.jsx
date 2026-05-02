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
import ReportsPage from "./ReportsPage";

function App() {
  const [page, setPage] = useState("login");

  return (
    <div className="login-page">
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

        {(page === "about" ||
          page === "dashboard" ||
          page === "reports" ||
          page === "alerts" ||
          page === "settings") && (
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

      <div className="page-content">
        {page === "login" && <LoginForm setPage={setPage} />}

        {page === "forgotPassword" && (
          <ForgotPassword setPage={setPage} />
        )}

        {page === "dashboard" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <Dashboard setPage={setPage} />
          </div>
        )}

        {page === "alerts" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <Alerts />
          </div>
        )}

        {page === "about" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <AboutUs />
          </div>
        )}

        {page === "reports" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <ReportsPage />
          </div>
        )}

        {page === "settings" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <SettingsPage setPage={setPage} />
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default App;