import LoginForm from "./components/LoginForm";
import "./App.css";

function App() {
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
        <LoginForm />
      </div>

    </div>

  );
}

export default App;