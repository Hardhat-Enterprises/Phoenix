import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./components/design.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
//This imports the provider that manages the saved app preferences
import PreferencesProvider from "./PreferencesProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        {/*This makes the preferences available to the complete application*/}
        <PreferencesProvider>
          <App />
        </PreferencesProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);