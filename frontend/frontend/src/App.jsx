import { useState } from "react";
import LoginForm from "./components/LoginForm";
import "./App.css";
import AboutUs from "./AboutUs";
import Sidebar from "./components/Sidebar";
import Dashboard from "./Dashboard";

// In this version, I set the default page to "dashboard"
// so I can test my assigned dashboard task (Item List section)

function App() {
  const [page, setPage] = useState("dashboard");

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

        {page === "dashboard" && <Dashboard setPage={setPage} />}

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