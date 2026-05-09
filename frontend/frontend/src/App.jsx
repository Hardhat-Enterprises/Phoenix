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

function highlightPageText(query) {
  const mainContent = document.querySelector(".page-content");
  if (!mainContent) return;

  const oldHighlights = mainContent.querySelectorAll("mark.search-highlight");

  oldHighlights.forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent));
  });

  mainContent.normalize();

  if (!query.trim()) return;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");

  const walker = document.createTreeWalker(
    mainContent,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest("mark")) return NodeFilter.FILTER_REJECT;
        if (["SCRIPT", "STYLE", "INPUT", "BUTTON"].includes(node.parentElement.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const textNodes = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach((node) => {
    const text = node.nodeValue;

    if (!regex.test(text)) return;
    regex.lastIndex = 0;

    const span = document.createElement("span");
    span.innerHTML = text.replace(
      regex,
      `<mark class="search-highlight">$1</mark>`
    );

    node.replaceWith(span);
  });
}

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

<<<<<<< HEAD
        {(page === "about" ||
          page === "dashboard" ||
          page === "reports" ||
          page === "alerts" ||
          page === "settings") && (
=======
        {page !== "login" && page !== "forgotPassword" && (
>>>>>>> c9825ef (Added functional search highlighting and reports updates)
          <div className="temp-header-right">
            <input
              type="text"
              placeholder="Search in site"
              className="temp-search"
              onChange={(e) => highlightPageText(e.target.value)}
            />
            <button className="temp-bell" aria-label="Notifications">
              🔔
            </button>
          </div>
        )}
      </div>

      <div className="page-content">
        {page === "login" && <LoginForm setPage={setPage} />}

<<<<<<< HEAD
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
=======
        {page === "forgotPassword" && <ForgotPassword setPage={setPage} />}

        {page === "dashboard" && <Dashboard setPage={setPage} page={page} />}
>>>>>>> c9825ef (Added functional search highlighting and reports updates)

        {page === "about" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
            <AboutUs />
          </div>
        )}

        {page === "reports" && (
          <div style={{ display: "flex" }}>
            <Sidebar setPage={setPage} page={page} />
<<<<<<< HEAD
            <ReportsPage />
=======
            <Reports />
>>>>>>> c9825ef (Added functional search highlighting and reports updates)
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