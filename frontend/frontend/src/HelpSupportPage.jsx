import { useState, useMemo, useEffect } from "react";
import { usePreferences } from "./PreferencesContext";
import "./HelpSupportPage.css";

// Support contact is a placeholder until the team approves the real address.
const SUPPORT_EMAIL = "phoenix.support@example.com";

//localStorage key used by Dashboard.jsx.
const DASHBOARD_CACHE_KEY = "phoenixDashboardSnapshot";

// ---------------------------------------------------------------------------
// Help content. Every answer describes ONLY what the current frontend does.
// No backend-only features, no real-time promises, no demo records.
// ---------------------------------------------------------------------------
const HELP_CATEGORIES = [
  {
    id: "getting-started",
    title: "Getting started",
    items: [
      {
        q: "What is PHOENIX?",
        a: "PHOENIX is a disaster and cyber risk monitoring dashboard. The frontend lets you browse hazard and threat information, view reports, and manage your display settings in the browser.",
      },
      {
        q: "How do I move around the app?",
        a: "Use the Main Menu on the left to switch between Dashboard, Alerts, Reports, Settings and this Help page. You can also type a page name into the 'Search in site' box in the header.",
      },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard navigation",
    items: [
      {
        q: "What does the Dashboard show?",
        a: "The Dashboard shows summary cards (API status, totals), a regional anomaly detection panel, and a risk map area. Data loads when you open the page; it does not update automatically in real time.",
        link: "dashboard",
        linkLabel: "Open Dashboard",
      },
      {
        q: "Why do some totals show 0 or a dash?",
        a: "When there is no data available yet, or the backend is not reachable, the cards show zero or a dash and the map shows no hazards. This is expected and the page will populate when data is available.",
      },
    ],
  },
  {
    id: "alerts",
    title: "Alerts page guidance",
    items: [
      {
        q: "What is on the Alerts page?",
        a: "The Alerts page lists threat and alert entries the frontend has loaded. Open it from the Main Menu to review the current entries.",
        link: "alerts",
        linkLabel: "Open Alerts",
      },
      {
        q: "Is the notification bell live?",
        a: "The notification bell in the header currently shows demonstration content to illustrate the interface. It is not connected to a live alerting service.",
      },
    ],
  },
  {
    id: "reports",
    title: "Reports page guidance",
    items: [
      {
        q: "What can I do on the Reports page?",
        a: "You can prepare a report and generate a PDF output from the information shown. Open Reports from the Main Menu.",
        link: "reports",
        linkLabel: "Open Reports",
      },
      {
        q: "What evidence file types are supported?",
        a: "Reports accept evidence as a URL or as plain text. There is no file upload; the report itself is produced as a PDF, which is the output format rather than an input.",
      },
    ],
  },
  {
    id: "settings",
    title: "Settings instructions",
    items: [
      {
        q: "How are my settings saved?",
        a: "Settings are stored in your browser's local storage on this device. They are not synced to a server, so they stay in the browser you set them in.",
        link: "settings",
        linkLabel: "Open Settings",
      },
      {
        q: "Will my settings appear on another computer?",
        a: "No. Because settings live in this browser only, you will need to set them again if you use a different browser or device.",
      },
    ],
  },
  {
    id: "account",
    title: "Account and sign-in guidance",
    items: [
      {
        q: "How do I sign in?",
        a: "Use the Login button in the header and enter your credentials. Your session is kept in the browser so you stay signed in while using the app.",
      },
      {
        q: "I forgot my password. What do I do?",
        a: "Password reset by email is not available in the current frontend. Please contact an administrator or the support address below for help regaining access.",
      },
    ],
  },
  {
    id: "accessibility",
    title: "Accessibility guidance",
    items: [
      {
        q: "Can I use the app with a keyboard?",
        a: "Yes. Interactive controls, including the FAQ questions on this page, can be reached with Tab and activated with Enter or Space. The Back-to-top control moves focus back to the page heading.",
      },
      {
        q: "Is the layout readable on small screens?",
        a: "Yes. The layout adjusts for mobile screen widths so content remains readable without horizontal scrolling.",
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    items: [
      {
        q: "The page looks broken or data won't load.",
        a: "First, refresh the page. If the problem continues, the backend may be unavailable — check that you are connected and try again shortly.",
      },
      {
        q: "How do I recover from an application error?",
        a: "Use the 'Clear saved data' button below. It removes this browser's cached dashboard data and saved settings, which resolves most display problems. It does not sign you out.",
        recovery: true,
      },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: "Does PHOENIX send real-time alerts?",
    a: "Not in the current frontend. The interface displays information when a page is opened; it does not push live alerts or update the map in real time.",
  },
  {
    q: "Is the map showing live hazards?",
    a: "The map area displays hazard records when they are available to the frontend. It is not a live, continuously updating feed.",
  },
  {
    q: "Why can't I upload a file to a report?",
    a: "Report evidence is entered as a URL or plain text. File upload is not part of the current frontend.",
  },
  {
    q: "Where is my data stored?",
    a: "Display settings and cached dashboard data are stored in your browser's local storage on this device only.",
  },
];

export default function HelpSupportPage({ setPage }) {
  const { clearUserPreferences, preferences } = usePreferences();
  const [query, setQuery] = useState("");
  const [openItems, setOpenItems] = useState({});
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clearStatus, setClearStatus] = useState(null);

  const normalisedQuery = query.trim().toLowerCase();

  // Show the Back-to-top button after the user scrolls down.
  useEffect(() => {
    function onScroll() {
      setShowBackToTop(window.scrollY > 300);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Filter every category + FAQ against the search query.
  const filteredCategories = useMemo(() => {
    if (!normalisedQuery) return HELP_CATEGORIES;
    return HELP_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.q.toLowerCase().includes(normalisedQuery) ||
          item.a.toLowerCase().includes(normalisedQuery)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [normalisedQuery]);

  const filteredFaq = useMemo(() => {
    if (!normalisedQuery) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (item) =>
        item.q.toLowerCase().includes(normalisedQuery) ||
        item.a.toLowerCase().includes(normalisedQuery)
    );
  }, [normalisedQuery]);

  const totalResults =
    filteredCategories.reduce((sum, c) => sum + c.items.length, 0) +
    filteredFaq.length;

  function toggleItem(key) {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // While searching, matching answers are expanded automatically.
  function isOpen(key) {
    if (normalisedQuery) return true;
    return Boolean(openItems[key]);
  }

  function handleCopyEmail() {
    navigator.clipboard.writeText(SUPPORT_EMAIL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleClearData() {
    if (
      preferences.confirmImportantActions
      && !window.confirm(
        "Clear saved dashboard data and preferences from this browser?",
      )
    ) {
      return;
    }

    let dashboardCleared = false;

    try {
      localStorage.removeItem(DASHBOARD_CACHE_KEY);
      dashboardCleared = true;
    } catch {
      dashboardCleared = false;
    }

    const preferencesResult = clearUserPreferences();
    let message = "Saved data could not be cleared from this browser.";

    if (dashboardCleared && preferencesResult.ok) {
      message = "Saved data cleared from this browser.";
    } else if (dashboardCleared) {
      message = "Dashboard cache cleared, but preferences could not be cleared.";
    } else if (preferencesResult.ok) {
      message = "Preferences cleared, but dashboard cache could not be cleared.";
    }

    setClearStatus({
      message,
      ok: dashboardCleared && preferencesResult.ok,
    });
    setTimeout(() => setClearStatus(null), 3000);
  }

  function backToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const heading = document.getElementById("help-heading");
    if (heading) heading.focus();
  }

  function goToPage(page) {
    if (typeof setPage === "function") setPage(page);
  }

  return (
    <div className="help-page">
      <header className="help-header">
        <h1 id="help-heading" tabIndex={-1}>
          Help &amp; Support
        </h1>
        <p className="help-intro">
          How to use the PHOENIX frontend: guidance for every page, common
          problems and quick answers. Everything described here reflects what the
          current frontend can do.
        </p>
      </header>

      <section className="help-search-box" aria-label="Search help topics">
        <label htmlFor="help-search" className="help-search-label">
          Search the help topics
        </label>
        <input
          id="help-search"
          type="search"
          className="help-search-input"
          placeholder="Try 'evidence', 'password' or 'map'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="help-result-count" role="status">
          {normalisedQuery
            ? `${totalResults} result${totalResults === 1 ? "" : "s"} found`
            : `${HELP_CATEGORIES.reduce((s, c) => s + c.items.length, 0) +
                FAQ_ITEMS.length} topics in ${HELP_CATEGORIES.length + 1} categories`}
        </p>
      </section>

      {/* Category chip navigation */}
      {!normalisedQuery && (
        <nav className="help-chips" aria-label="Help categories">
          {HELP_CATEGORIES.map((cat) => (
            <a key={cat.id} href={`#${cat.id}`} className="help-chip">
              {cat.title}
            </a>
          ))}
          <a href="#faq" className="help-chip">
            FAQ
          </a>
        </nav>
      )}

      {filteredCategories.map((cat) => (
        <section key={cat.id} id={cat.id} className="help-category">
          <h2>{cat.title}</h2>
          {cat.items.map((item, idx) => {
            const key = `${cat.id}-${idx}`;
            return (
              <div className="help-item" key={key}>
                <button
                  className="help-question"
                  onClick={() => toggleItem(key)}
                  aria-expanded={isOpen(key)}
                  aria-controls={`answer-${key}`}
                >
                  <span>{item.q}</span>
                  <span className="help-caret" aria-hidden="true">
                    {isOpen(key) ? "−" : "+"}
                  </span>
                </button>
                {isOpen(key) && (
                  <div id={`answer-${key}`} className="help-answer">
                    <p>{item.a}</p>
                    {item.link && (
                      <button
                        className="help-link-btn"
                        onClick={() => goToPage(item.link)}
                      >
                        {item.linkLabel || "Open page"}
                      </button>
                    )}
                    {item.recovery && (
                      <button
                        className="help-recovery-btn"
                        onClick={handleClearData}
                      >
                        Clear saved data
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}

      {/* FAQ */}
      {filteredFaq.length > 0 && (
        <section id="faq" className="help-category">
          <h2>Frequently asked questions</h2>
          {filteredFaq.map((item, idx) => {
            const key = `faq-${idx}`;
            return (
              <div className="help-item" key={key}>
                <button
                  className="help-question"
                  onClick={() => toggleItem(key)}
                  aria-expanded={isOpen(key)}
                  aria-controls={`answer-${key}`}
                >
                  <span>{item.q}</span>
                  <span className="help-caret" aria-hidden="true">
                    {isOpen(key) ? "−" : "+"}
                  </span>
                </button>
                {isOpen(key) && (
                  <div id={`answer-${key}`} className="help-answer">
                    <p>{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Support contact */}
      <section className="help-category" id="support">
        <h2>Support contact</h2>
        <p>
          For help that isn't answered above, contact the PHOENIX support team.
        </p>
        <div className="help-support-row">
          <code className="help-email">{SUPPORT_EMAIL}</code>
          <button className="help-copy-btn" onClick={handleCopyEmail}>
            {copied ? "Copied" : "Copy email"}
          </button>
        </div>
        <p className="help-note">
          Note: this support address is a placeholder and must be approved by the
          team before publication.
        </p>
      </section>

      {clearStatus && (
        <div className="help-toast" role={clearStatus.ok ? "status" : "alert"}>
          {clearStatus.message}
        </div>
      )}

      {showBackToTop && (
        <button className="help-back-to-top" onClick={backToTop}>
          ↑ Back to top
        </button>
      )}
    </div>
  );
}
