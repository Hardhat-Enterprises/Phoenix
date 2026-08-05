import { useEffect, useRef, useState } from "react";
import "./HelpSupportPage.css";

// Placeholder address. The real support contact must be confirmed by the
// PHOENIX team before this page is published.
const SUPPORT_EMAIL = "phoenix.support@example.com";

const HELP_CATEGORIES = [
  {
    id: "getting-started",
    title: "Getting started",
    description:
      "What the PHOENIX dashboard is and how to find your way around.",
    items: [
      {
        id: "gs-what-is",
        question: "What is the PHOENIX dashboard?",
        answer: [
          "PHOENIX is a disaster and cyber risk monitoring dashboard. It combines hazard monitoring, cyber threat visibility and alert-based insights in a single view so you can review physical and digital risks during disaster events.",
        ],
        links: [{ label: "Open the Dashboard", target: "dashboard" }],
      },
      {
        id: "gs-layout",
        question: "How is the screen laid out?",
        answer: [
          "The header at the top holds the Phoenix logo (select it to return to the Dashboard), the site search box, the notifications button and the Login/Logout controls.",
          "The Main Menu sidebar on the left opens each page: Dashboard, Alerts, Reports, About Us, Settings, Threat Details, Risk Assessment and this Help & Support page.",
        ],
      },
      {
        id: "gs-sign-in-first",
        question: "Do I need to sign in?",
        answer: [
          "You can open every page without signing in, but most data comes from the Phoenix backend and needs a signed-in session. If a page shows a sign-in message or empty totals, sign in first and the data will load.",
        ],
        links: [{ label: "Go to Settings to sign in", target: "settings" }],
      },
      {
        id: "gs-refresh",
        question: "How current is the data I see?",
        answer: [
          "Each page loads its data from the backend when the page opens. The information does not update live while you are viewing it — refresh the browser page, or use a page's Refresh button where one is provided, to load the latest records.",
        ],
      },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard navigation",
    description: "Understanding each section of the main Dashboard page.",
    items: [
      {
        id: "db-overview",
        question: "What do the overview cards show?",
        answer: [
          "The four cards at the top show the backend API status and the total number of hazards, threats and risks returned by the backend. If the API is unreachable the status card shows \"Unavailable\".",
        ],
        links: [{ label: "Open the Dashboard", target: "dashboard" }],
      },
      {
        id: "db-anomaly",
        question: "How do I run a Regional Anomaly Detection?",
        answer: [
          "Choose an Australian region and a timestamp, then select Run Detection. The request is sent to the backend anomaly model and the output panel fills in the region, status, risk level, anomaly score and confidence when the result arrives.",
          "If the backend does not expose the anomaly endpoint yet, the page tells you so — that is a backend limitation, not a problem with your input.",
        ],
      },
      {
        id: "db-map",
        question: "How does the Risk Map work?",
        answer: [
          "The Risk Map places hazard records loaded from the backend onto an OpenStreetMap base map. Markers are grouped when several hazards share the same type, location and severity, and a marker is marked approximate when only a state or region name was available.",
          "The map is a snapshot of the records loaded with the page. It does not update live — refresh the page to load newer hazard data.",
        ],
      },
      {
        id: "db-chart",
        question: "What does the Threat Chart show?",
        answer: [
          "The Threat Chart shows how many threats the backend currently reports at each severity level (Critical, High, Medium, Low). The \"Last updated\" time comes from the backend response; if no date is returned, the chart says the date is unavailable rather than guessing.",
        ],
      },
      {
        id: "db-signals",
        question: "How do I open the details of a threat signal?",
        answer: [
          "In the Recent Threat Signals list, select a row (or focus it with the keyboard and press Enter or Space) to open the Threat Details page for that signal. The View All button takes you to the Alerts page.",
        ],
        links: [{ label: "Open Threat Details", target: "threats" }],
      },
      {
        id: "db-signed-out",
        question: "Why does the Dashboard show old numbers when I am signed out?",
        answer: [
          "When you are signed out, the Dashboard shows the last data snapshot saved in this browser from a previous signed-in visit, if one exists. Sign in to load current data from the backend.",
        ],
      },
    ],
  },
  {
    id: "alerts",
    title: "Alerts page guidance",
    description: "Reading, filtering and understanding hazard alerts.",
    items: [
      {
        id: "al-source",
        question: "Where do the alerts come from?",
        answer: [
          "The Alerts page lists hazard records loaded from the backend hazards endpoint. Loading them requires a signed-in session — if you see a sign-in message, log in and reopen the page.",
        ],
        links: [{ label: "Open Alerts", target: "alerts" }],
      },
      {
        id: "al-filters",
        question: "How do I filter the alert list?",
        answer: [
          "Use the three dropdowns above the list to filter by Hazard Type, Alert Level and Hazard Status. The filter options are built from the records that were actually returned, and the summary cards and chart update to match your selection.",
        ],
      },
      {
        id: "al-grouping",
        question: "Why do some alerts say \"matches\"?",
        answer: [
          "Records with the same hazard type, location, priority, status and severity are grouped into one card so duplicates do not flood the list. The badge shows how many underlying records the card represents.",
        ],
      },
      {
        id: "al-evidence",
        question: "What is the reported evidence on an alert?",
        answer: [
          "Some hazard records include reported evidence text and links. Evidence links open in a new browser tab. Treat them with caution: evidence can reference suspicious or fraudulent sites, so do not enter personal or payment details on a page you reached from alert evidence.",
        ],
      },
      {
        id: "al-notifications",
        question: "Are the bell notifications real alerts?",
        answer: [
          "No. The notification panel opened from the header bell currently shows demonstration data only, and it is labelled that way in the panel. It is not connected to the backend, and no real alert is sent from it.",
        ],
      },
    ],
  },
  {
    id: "reports",
    title: "Reports page guidance",
    description: "Running risk checks on evidence and downloading reports.",
    items: [
      {
        id: "rp-run",
        question: "How do I run a URL/Text risk check?",
        answer: [
          "Enter a URL, evidence text, or both, review the hazard context fields (type, severity, timestamp, location, status, alert level and source), then select Check Risk. The request goes to the backend core model and the Model Output section shows the risk level, risk score, confidence and predicted class when the result arrives.",
          "If the output is still processing, use Refresh Results to check again.",
        ],
        links: [{ label: "Open Reports", target: "reports" }],
      },
      {
        id: "rp-evidence-types",
        question: "What evidence types are supported?",
        answer: [
          "The risk check accepts two kinds of evidence input: a URL and plain text. You can supply either one or both.",
          "File uploads are not supported — you cannot attach images, screenshots, PDFs, videos or documents as evidence in this version. If your evidence is in a file, paste the relevant text or link instead.",
        ],
      },
      {
        id: "rp-download",
        question: "How do I download a verification report?",
        answer: [
          "The Generated Verification Reports table builds a downloadable report from the latest backend core model record. Select Download to save it as a PDF file.",
        ],
      },
    ],
  },
  {
    id: "settings",
    title: "Settings instructions",
    description: "Managing preferences and where they are stored.",
    items: [
      {
        id: "st-filters",
        question: "What can I configure in Settings?",
        answer: [
          "You can choose which threat alert types you are interested in (flood, cyber, bushfire), turn location tracking on or off, and set an alert radius of 20, 50 or 100 km.",
        ],
        links: [{ label: "Open Settings", target: "settings" }],
      },
      {
        id: "st-storage",
        question: "Where are my settings saved?",
        answer: [
          "Settings are saved automatically in this browser on this device the moment you change them — the header shows the time of the last save. They are not stored against your account, so a different browser or device starts from the defaults.",
          "The Reset button returns everything to the default values.",
        ],
      },
      {
        id: "st-location",
        question: "How does location tracking work?",
        answer: [
          "When you enable Allow Location Tracking, the browser asks for permission and your coordinates are saved with your settings in this browser only. They are not sent to a server. If permission is declined, the setting stays off.",
        ],
      },
    ],
  },
  {
    id: "account",
    title: "Account and sign-in",
    description: "Signing in and out, and managing your account.",
    items: [
      {
        id: "ac-sign-in",
        question: "How do I sign in?",
        answer: [
          "Select Login in the header, then enter your username or email and your password. After signing in you are returned to the Dashboard and your role is shown in the header.",
        ],
      },
      {
        id: "ac-forgot",
        question: "I forgot my password. What do I do?",
        answer: [
          "The login page links to a Forgot Password form, but automatic password reset emails are not available in this version of the frontend. To regain access, contact your PHOENIX administrator and ask them to reset your account.",
        ],
      },
      {
        id: "ac-sign-out",
        question: "How do I sign out or switch user?",
        answer: [
          "Use the Logout button in the header, or open Settings and use Log Out. Change User on the Settings page signs you out and takes you straight to the login form.",
        ],
        links: [{ label: "Open Settings", target: "settings" }],
      },
      {
        id: "ac-admin",
        question: "How are new accounts created?",
        answer: [
          "Only administrators can create accounts. When signed in as an admin, open the Admin menu in the header and choose Create user. If you need an account, ask your administrator.",
        ],
      },
    ],
  },
  {
    id: "accessibility",
    title: "Accessibility",
    description: "Using PHOENIX with a keyboard, screen reader or small screen.",
    items: [
      {
        id: "ax-keyboard",
        question: "Can I use PHOENIX with only a keyboard?",
        answer: [
          "Yes. Move between controls with Tab and Shift+Tab and activate them with Enter or Space. This includes the sidebar menu, the questions on this page, dashboard threat rows and the admin menu (which also closes with Escape).",
        ],
      },
      {
        id: "ax-announcements",
        question: "How are loading and error messages announced?",
        answer: [
          "Loading, empty and error panels use live regions, so screen readers announce when data is loading, when a section has no records and when something went wrong. Error panels include a Retry or Refresh button where recovery is possible.",
        ],
      },
      {
        id: "ax-zoom",
        question: "Does the layout work when zoomed or on a phone?",
        answer: [
          "The pages use a responsive layout, so content reflows on small screens and at higher browser zoom levels. On this page, use the Back to top button that appears while scrolling to return to the search box quickly.",
        ],
      },
      {
        id: "ax-print",
        question: "Can I print this help page?",
        answer: [
          "Yes. When you print (Ctrl+P or Cmd+P), every question is expanded automatically and the navigation, search box and buttons are left out, so the printout reads as a plain document.",
        ],
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    description: "Fixing common problems and recovering from errors.",
    hasRecoveryTools: true,
    items: [
      {
        id: "tr-api-unavailable",
        question: "The API status says \"Unavailable\" or data will not load",
        answer: [
          "The frontend could not reach the Phoenix API gateway. If you run the stack locally, check that Docker is running and that the gateway is available on localhost:3001, then use the Retry or Refresh button on the page.",
        ],
      },
      {
        id: "tr-sign-in-required",
        question: "A page says sign-in is required",
        answer: [
          "Your session is missing or has expired. Sign in again from the header Login button and reopen the page. If you were signed in, logging out and back in refreshes the session.",
        ],
      },
      {
        id: "tr-empty",
        question: "A section says there are no records",
        answer: [
          "An empty state is not an error — it means the backend responded but returned no matching records. On the Alerts page, also check that your filters are not excluding everything: set the dropdowns back to the \"All\" options.",
        ],
        links: [{ label: "Open Alerts", target: "alerts" }],
      },
      {
        id: "tr-map-placement",
        question: "The map says hazards loaded but none are placed",
        answer: [
          "Hazard records were returned but none of them included a location the map could use. The records are still listed on the Alerts page; the map simply has nothing it can position until records include usable locations.",
        ],
      },
      {
        id: "tr-recover",
        question: "How do I recover from an application error?",
        answer: [
          "Try these steps in order:",
        ],
        list: [
          "Use the Retry or Refresh button shown in the error panel, or refresh the browser page.",
          "Sign out and sign back in, in case your session expired.",
          "Clear the data PHOENIX saved in this browser using the button below, then refresh the page.",
          "If the problem continues, contact support with the page name, what you did, and the exact error message.",
        ],
      },
    ],
  },
  {
    id: "faq",
    title: "Frequently asked questions",
    description: "Quick answers to common questions.",
    items: [
      {
        id: "faq-realtime",
        question: "Is the data real-time?",
        answer: [
          "No. Data is loaded from the backend when a page opens, and the map and charts do not update live while you watch them. Refresh a page, or use its Refresh button, to load the latest records.",
        ],
      },
      {
        id: "faq-push",
        question: "Does PHOENIX send alerts to my email or phone?",
        answer: [
          "No. This version does not send email, SMS or push notifications. The bell in the header shows demonstration data only.",
        ],
      },
      {
        id: "faq-numbers",
        question: "Why do totals differ slightly between pages?",
        answer: [
          "Pages load their data at different moments and from different endpoints, and lists are limited to a page of records. A total on one page can therefore lag a refresh made on another.",
        ],
      },
      {
        id: "faq-privacy",
        question: "Is my location shared with anyone?",
        answer: [
          "No. The location saved by the Settings page is stored only in this browser and is not sent to a server.",
        ],
        links: [{ label: "Open Settings", target: "settings" }],
      },
      {
        id: "faq-mobile",
        question: "Can I use PHOENIX on a phone or tablet?",
        answer: [
          "Yes. The layout is responsive and works in a mobile browser. No separate app is needed.",
        ],
      },
    ],
  },
];

const itemSearchText = (item) =>
  [
    item.question,
    ...(item.answer || []),
    ...(item.list || []),
    ...(item.links || []).map((link) => link.label),
  ]
    .join(" ")
    .toLowerCase();

function HelpItem({ item, categoryId, expanded, onToggle, goTo }) {
  const toggleId = `${categoryId}-${item.id}-toggle`;
  const panelId = `${categoryId}-${item.id}-panel`;

  return (
    <div className="help-item">
      <h3 className="help-item-heading">
        <button
          type="button"
          id={toggleId}
          className="help-item-toggle"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span>{item.question}</span>
          <span className="help-item-icon" aria-hidden="true">
            {expanded ? "−" : "+"}
          </span>
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={toggleId}
        className={`help-item-body ${expanded ? "" : "collapsed"}`}
      >
        {item.answer.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        {item.list && (
          <ol className="help-item-list">
            {item.list.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ol>
        )}

        {item.links && (
          <div className="help-item-links">
            {item.links.map((link) => (
              <button
                key={link.target}
                type="button"
                className="help-page-link"
                onClick={() => goTo(link.target)}
              >
                {link.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HelpSupportPage({ setPage, searchQuery = "" }) {
  const [query, setQuery] = useState(searchQuery);
  const [openItems, setOpenItems] = useState(() => new Set());
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const headingRef = useRef(null);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 320);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(
    () => () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    },
    [],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  const visibleCategories = HELP_CATEGORIES.map((category) => {
    if (!isSearching) {
      return { ...category, visibleItems: category.items };
    }

    const categoryMatches = category.title
      .toLowerCase()
      .includes(normalizedQuery);
    const visibleItems = categoryMatches
      ? category.items
      : category.items.filter((item) =>
          itemSearchText(item).includes(normalizedQuery),
        );

    return { ...category, visibleItems };
  }).filter((category) => category.visibleItems.length > 0);

  const visibleItemCount = visibleCategories.reduce(
    (total, category) => total + category.visibleItems.length,
    0,
  );

  const toggleItem = (itemId) => {
    setOpenItems((current) => {
      const next = new Set(current);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  };

  const goTo = (target) => setPage?.(target);

  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    headingRef.current?.focus();
  };

  const showCopyMessage = (message) => {
    setCopyMessage(message);

    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current);
    }

    copyTimerRef.current = window.setTimeout(() => setCopyMessage(""), 4000);
  };

  const copySupportEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      showCopyMessage("Support email copied to the clipboard.");
    } catch {
      showCopyMessage(`Copying is not available. Email: ${SUPPORT_EMAIL}`);
    }
  };

  const clearSavedData = () => {
    const confirmed = window.confirm(
      "Clear the PHOENIX data saved in this browser (dashboard snapshot and settings preferences)? Your account is not affected.",
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem("phoenixDashboardSnapshot");
    localStorage.removeItem("phoenixSettings");
    setRecoveryMessage(
      "Saved browser data cleared. Refresh the page to reload with defaults.",
    );
  };

  return (
    <div className="help-page">
      <div className="help-shell">
        <header className="help-header">
          <h1 ref={headingRef} tabIndex={-1}>
            Help &amp; Support
          </h1>
          <p>
            How to use the PHOENIX frontend: guidance for every page, common
            problems and quick answers. Everything described here reflects what
            the current frontend can do.
          </p>
        </header>

        <div className="help-search-panel">
          <label htmlFor="help-search">Search the help topics</label>
          <input
            id="help-search"
            type="search"
            placeholder="Try 'evidence', 'password' or 'map'"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <p className="help-search-status" role="status">
            {isSearching
              ? `${visibleItemCount} matching topic${
                  visibleItemCount === 1 ? "" : "s"
                }`
              : `${HELP_CATEGORIES.reduce(
                  (total, category) => total + category.items.length,
                  0,
                )} topics in ${HELP_CATEGORIES.length} categories`}
          </p>
        </div>

        <nav className="help-toc" aria-label="Help categories">
          {HELP_CATEGORIES.map((category) => (
            <a key={category.id} href={`#help-${category.id}`}>
              {category.title}
            </a>
          ))}
          <a href="#help-contact">Contact support</a>
        </nav>

        {visibleCategories.length === 0 ? (
          <div className="help-no-results" role="status">
            <h2>No topics match &ldquo;{query}&rdquo;</h2>
            <p>
              Try a shorter keyword, or clear the search to browse every
              category. If you cannot find an answer, use the support contact at
              the bottom of this page.
            </p>
            <button
              type="button"
              className="help-page-link"
              onClick={() => setQuery("")}
            >
              Clear search
            </button>
          </div>
        ) : (
          visibleCategories.map((category) => (
            <section
              key={category.id}
              id={`help-${category.id}`}
              className="help-category"
              aria-label={category.title}
            >
              <div className="help-category-heading">
                <h2>{category.title}</h2>
                <p>{category.description}</p>
              </div>

              {category.visibleItems.map((item) => (
                <HelpItem
                  key={item.id}
                  item={item}
                  categoryId={category.id}
                  expanded={isSearching || openItems.has(item.id)}
                  onToggle={() => toggleItem(item.id)}
                  goTo={goTo}
                />
              ))}

              {category.hasRecoveryTools && (
                <div className="help-recovery-panel">
                  <div>
                    <strong>Reset saved browser data</strong>
                    <p>
                      Removes the dashboard snapshot and settings preferences
                      PHOENIX saved in this browser. Use this when a page keeps
                      failing after a refresh. Your account is not affected.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="help-page-link danger"
                    onClick={clearSavedData}
                  >
                    Clear saved data
                  </button>

                  {recoveryMessage && (
                    <p className="help-inline-status" role="status">
                      {recoveryMessage}
                    </p>
                  )}
                </div>
              )}
            </section>
          ))
        )}

        <section
          id="help-contact"
          className="help-category help-contact"
          aria-label="Support contact"
        >
          <div className="help-category-heading">
            <h2>Support contact</h2>
            <p>
              Could not find what you need? Contact the PHOENIX support team.
            </p>
          </div>

          <p className="help-contact-note" role="note">
            The contact details below are placeholders and must be approved by
            the PHOENIX team before this page is published.
          </p>

          <div className="help-contact-row">
            <span className="help-contact-email">{SUPPORT_EMAIL}</span>
            <button
              type="button"
              className="help-page-link"
              onClick={copySupportEmail}
            >
              Copy support email
            </button>
          </div>

          {copyMessage && (
            <p className="help-inline-status" role="status">
              {copyMessage}
            </p>
          )}

          <p>
            When you contact support, include the page you were on, the steps
            you took, the exact error message and the browser you are using.
            That detail makes problems much faster to resolve.
          </p>
        </section>
      </div>

      {showBackToTop && (
        <button
          type="button"
          className="help-back-to-top"
          onClick={backToTop}
          aria-label="Back to top"
        >
          &uarr; Top
        </button>
      )}
    </div>
  );
}

export default HelpSupportPage;
