// Static navigation search index.
// No API call is involved — this is the single source of truth for
// everything the global search can find.
//
// Each entry:
//   id         unique, stable string (used as the React key)
//   type       "page" | "section" | "action"
//   title      the label shown to the user
//   page       the goToPage(...) target for this app's navigation
//   sectionId  optional DOM element id to scroll to after navigating
//   group      groups results in the results panel
//   keywords   extra searchable terms not in the title
//   adminOnly  true if this destination must be hidden from non-admins

export const searchIndex = [
  { id: "page-dashboard", type: "page", title: "Dashboard", page: "dashboard", group: "Dashboard", keywords: ["home", "overview"], adminOnly: false },
  { id: "page-alerts", type: "page", title: "Alerts", page: "alerts", group: "Alerts", keywords: ["notifications", "threat signals"], adminOnly: false },
  { id: "page-reports", type: "page", title: "Reports", page: "reports", group: "Reports", keywords: ["reporting", "export"], adminOnly: false },
  { id: "page-settings", type: "page", title: "Settings", page: "settings", group: "Settings", keywords: ["preferences", "configuration", "account"], adminOnly: false },
  { id: "page-about", type: "page", title: "About Us", page: "about", group: "About Us", keywords: ["team", "company", "who we are"], adminOnly: false },
  { id: "page-help", type: "page", title: "Help and Support", page: "help", group: "Help and Support", keywords: ["faq", "contact", "support ticket"], adminOnly: false },
  { id: "page-login", type: "page", title: "Login", page: "login", group: "Login", keywords: ["sign in", "log in"], adminOnly: false },
  { id: "page-risk-assessment", type: "page", title: "Risk Assessment", page: "riskAssessment", group: "Risk Assessment", keywords: ["risk", "assessment"], adminOnly: false },

  { id: "action-create-user", type: "action", title: "Create User", page: "createUser", group: "Administration", keywords: ["add user", "new user", "invite", "admin"], adminOnly: true },

  { id: "section-dashboard-threat-chart", type: "section", title: "Threat Chart", page: "dashboard", sectionId: "threat-chart-section", group: "Dashboard", keywords: ["severity", "critical", "high", "medium", "low", "chart"], adminOnly: false },
  { id: "section-dashboard-risk-map", type: "section", title: "Risk Map", page: "dashboard", sectionId: "risk-map-section", group: "Dashboard", keywords: ["map", "hazards", "location"], adminOnly: false },
  { id: "section-dashboard-anomaly-detection", type: "section", title: "Regional Anomaly Detection", page: "dashboard", sectionId: "anomaly-detection-section", group: "Dashboard", keywords: ["anomaly", "detection", "region", "model"], adminOnly: false },
  { id: "section-dashboard-recent-signals", type: "section", title: "Recent Threat Signals", page: "dashboard", sectionId: "recent-signals-section", group: "Dashboard", keywords: ["signals", "activity", "recent threats"], adminOnly: false },
];