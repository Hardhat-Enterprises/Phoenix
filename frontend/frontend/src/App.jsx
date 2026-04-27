import { useState } from "react";
import LoginForm from "./components/LoginForm";
import "./App.css";
import AboutUs from "./AboutUs";
import Dashboard from "./Dashboard";
import Sidebar from "./components/Sidebar";

function App() {
  const [page, setPage] = useState("login");

  return (
    <div className="login-page">
      <div className="temp-header">
        <div className="temp-header-left">
          <div className="temp-logo">🔥</div>
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

      <div className="page-content">
        {page === "login" && <LoginForm setPage={setPage} />}

    {page === "dashboard" && (
  <div style={{ display: "flex" }}>
    <Sidebar setPage={setPage} />
    <div style={{ flex: 1 }}>
      <Dashboard />
    </div>
  </div>
)}

        {page === "about" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} />
            <AboutUs />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;