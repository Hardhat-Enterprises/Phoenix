import {useState} from "react";
import LoginForm from "./components/LoginForm";
import "./App.css";
import AboutUs from "./AboutUs";

function App() {
  const [showAbout, setShowAbout] = useState(false);
  
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
        {showAbout ? (
          <>
            <AboutUs />
            <button onClick={() => setShowAbout(false)}>
              back button login
            </button>
          </>
        ) : (
          <>
            <LoginForm />
            <button onClick={() => setShowAbout(true)}>
              About Us
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;