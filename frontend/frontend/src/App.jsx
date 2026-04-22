import { useState } from "react";
import LoginForm from "./components/LoginForm";
import "./App.css";
import AboutUs from "./AboutUs";
import Sidebar from "./components/Sidebar";
import ForgotPassword from "./ForgotPassword";

function App() {
  const [page, setPage] = useState("login");

  return (
    <div className="login-page">
      <div className="temp-header">
        <div className="temp-logo">🔥</div>
        <div>
          <h2>Phoenix</h2>
          <p>Disaster and Cyber Risk Monitoring Dashboard</p>
        </div>
      </div>

      <div className="page-content">

        {page === "login" && (
          <LoginForm setPage={setPage} />
        )}
        {page === "forgotPassword" && (
          <ForgotPassword setPage={setPage} />
        )}


        {page === "dashboard" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} />

            <div style={{ padding: "20px" }}>
              <h1>Dashboard</h1>
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