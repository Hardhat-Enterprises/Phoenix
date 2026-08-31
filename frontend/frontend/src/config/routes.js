// Single source of truth for PHOENIX navigation.
// Sidebar, routing, page titles and the global search all read from here.

export const APP_NAME = "Phoenix";

export const ROUTES = [
  {
    key: "dashboard",
    path: "/dashboard",
    label: "Dashboard",
    title: "Dashboard",
    inSidebar: true,
  },
  {
    key: "alerts",
    path: "/alerts",
    label: "Alerts",
    title: "Alerts",
    inSidebar: true,
  },
  {
    key: "reports",
    path: "/reports",
    label: "Reports",
    title: "Reports",
    inSidebar: true,
  },
  {
    key: "about",
    path: "/about",
    label: "About Us",
    title: "About Us",
    inSidebar: true,
  },
  {
    key: "settings",
    path: "/settings",
    label: "Settings",
    title: "Settings",
    inSidebar: true,
  },
  {
    key: "threats",
    path: "/threats",
    label: "Threat Details",
    title: "Threat Details",
    inSidebar: true,
  },
  {
    key: "riskAssessment",
    path: "/risk-assessment",
    label: "Risk Assessment",
    title: "Risk Assessment",
    inSidebar: true,
  },
  {
    key: "help",
    path: "/help",
    label: "Help and Support",
    title: "Help and Support",
    inSidebar: true,
  },
  {
    key: "login",
    path: "/login",
    label: "Login",
    title: "Login",
  },
  {
    key: "forgotPassword",
    path: "/forgot-password",
    label: "Forgot Password",
    title: "Forgot Password",
  },
  {
    key: "createUser",
    path: "/admin/create-user",
    label: "Create User",
    title: "Create User",
    adminOnly: true,
  },
  {
    key: "integrationHealth",
    path: "/admin/integration-health",
    label: "Integration Health",
    title: "Integration Health",
    adminOnly: true,
  },
];

export const HOME_PATH = "/dashboard";

// Pages the Threat Details Back action must never return to.
export const NON_RETURNABLE_PATHS = [
  "/login",
  "/forgot-password",
  "/threats",
];

// Sidebar links for the current user.
export function sidebarRoutes({ isAdmin = false } = {}) {
  return ROUTES.filter(
    (route) => route.inSidebar && (!route.adminOnly || isAdmin),
  );
}

// Everything the global navigation search may surface for the current user.
export function searchableRoutes({ isAdmin = false } = {}) {
  return ROUTES.filter((r) => !r.path.includes(":") && (!r.adminOnly || isAdmin));
}

// Translate an old setPage("dashboard") key into a real URL.
export function pathForKey(key) {
  const match = ROUTES.find((route) => route.key === key);

  return match ? match.path : HOME_PATH;
}

// Build the URL for a single threat.
export function threatPath(threatId) {
  return `/threats/${encodeURIComponent(threatId)}`;
}

// Find the route entry for a browser path.
// Exact paths win; parameterised paths such as /threats/:threatId are
// matched by prefix so the tab title is still correct on /threats/abc123.
export function routeForPath(pathname) {
  const exact = ROUTES.find((r) => !r.path.includes(":") && r.path === pathname);
  if (exact) return exact;

  return ROUTES.find((r) => {
    if (!r.path.includes(":")) return false;
    const prefix = r.path.split("/:")[0];
    return pathname.startsWith(`${prefix}/`);
  });
}