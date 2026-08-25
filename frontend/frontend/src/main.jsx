import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// BrowserRouter was missing here — App.jsx (and Sidebar.jsx) use react-router
// hooks and components (useNavigate, useLocation, Link, NavLink, Routes),
// all of which throw immediately if there's no <Router> ancestor. That was
// the root cause of the app entering the error boundary on every load.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
