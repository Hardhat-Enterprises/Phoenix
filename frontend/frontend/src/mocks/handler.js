import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  mockAuthResponse,
  mockThreatList,
  mockHazardList,
  mockDashboardOverview,
  mockDashboardCharts,
  mockDashboardActivity,
  mockNotifications,
  mockIntegrations,
  mockRiskAssessments,
  mockHealth,
  mockUnauthorized,
  mockNotFound,
  mockForbidden,
  mockErrorResponse,
} from "./data.js";

const API_BASE = "http://localhost:3001";

/**
 * MSW Request Handlers
 * Define API endpoints and their responses for testing
 */
export const handlers = [
  // ============= AUTHENTICATION =============
  http.post(`${API_BASE}/api/users/auth/login`, async ({ request }) => {
    const body = await request.json();

    // Test valid credentials
    if (
      (body.username === "testuser" || body.email === "test@example.com") &&
      body.password === "password123"
    ) {
      return HttpResponse.json(mockAuthResponse);
    }

    // Test invalid credentials
    return HttpResponse.json(
      { status: 401, message: "Invalid credentials" },
      { status: 401 },
    );
  }),

  // ============= DASHBOARD =============
  http.get(`${API_BASE}/api/users/dashboard/overview`, ({ request }) => {
    if (!request.headers.get("Authorization")) {
      return HttpResponse.json(mockUnauthorized, { status: 401 });
    }
    return HttpResponse.json(mockDashboardOverview);
  }),

  http.get(`${API_BASE}/api/users/dashboard/charts`, ({ request }) => {
    if (!request.headers.get("Authorization")) {
      return HttpResponse.json(mockUnauthorized, { status: 401 });
    }
    return HttpResponse.json(mockDashboardCharts);
  }),

  http.get(`${API_BASE}/api/users/dashboard/activity`, ({ request }) => {
    if (!request.headers.get("Authorization")) {
      return HttpResponse.json(mockUnauthorized, { status: 401 });
    }
    return HttpResponse.json(mockDashboardActivity);
  }),

  // ============= THREATS =============
  http.get(`${API_BASE}/api/users/threats`, ({ request }) => {
    if (!request.headers.get("Authorization")) {
      return HttpResponse.json(mockUnauthorized, { status: 401 });
    }

    // Support pagination and filtering
    const url = new URL(request.url);
    const page = url.searchParams.get("page") || 1;
    const limit = url.searchParams.get("limit") || 10;
    const search = url.searchParams.get("search");

    let data = [...mockThreatList.data];

    if (search) {
      data = data.filter((t) =>
        t.title.toLowerCase().includes(search.toLowerCase()),
      );
    }

    return HttpResponse.json({
      ...mockThreatList,
      page: parseInt(page),
      limit: parseInt(limit),
      total: data.length,
      data,
    });
  }),

  http.get(`${API_BASE}/api/users/threats/:threatId`, ({ request, params }) => {
    if (!request.headers.get("Authorization")) {
      return HttpResponse.json(mockUnauthorized, { status: 401 });
    }

    const { threatId } = params;

    // Test invalid threat ID
    if (threatId === "invalid-id") {
      return HttpResponse.json(mockNotFound, { status: 404 });
    }

    // Return threat matching the ID
    const threat = mockThreatList.data.find(
      (t) => t.id === threatId || t.threat_id === threatId,
    );

    if (!threat) {
      return HttpResponse.json(mockNotFound, { status: 404 });
    }

    return HttpResponse.json({ ...threat, status: 200 });
  }),

  // ============= HAZARDS =============
  http.get(`${API_BASE}/api/users/hazards`, ({ request }) => {
    if (!request.headers.get("Authorization")) {
      return HttpResponse.json(mockUnauthorized, { status: 401 });
    }
    return HttpResponse.json(mockHazardList);
  }),

  http.get(`${API_BASE}/api/users/hazards/:hazardId`, ({ request, params }) => {
    if (!request.headers.get("Authorization")) {
      return HttpResponse.json(mockUnauthorized, { status: 401 });
    }

    const { hazardId } = params;

    if (hazardId === "invalid-id") {
      return HttpResponse.json(mockNotFound, { status: 404 });
    }

    return HttpResponse.json({ ...mockHazardList.data[0], status: 200 });
  }),

  // ============= LOCATIONS =============
  http.get(`${API_BASE}/api/users/locations`, ({ request }) => {
    if (!request.headers.get("Authorization")) {
      return HttpResponse.json(mockUnauthorized, { status: 401 });
    }
    return HttpResponse.json({
      status: 200,
      data: [
        {
          id: "loc-1",
          name: "Sydney",
          state: "NSW",
          latitude: -33.87,
          longitude: 151.21,
        },
        {
          id: "loc-2",
          name: "Melbourne",
          state: "VIC",
          latitude: -37.81,
          longitude: 144.96,
        },
      ],
    });
  }),

  // ============= RISKS =============
  http.get(`${API_BASE}/api/users/risks`, ({ request }) => {
    if (!request.headers.get("Authorization")) {
      return HttpResponse.json(mockUnauthorized, { status: 401 });
    }
    return HttpResponse.json({
      status: 200,
      data: [],
    });
  }),

  // ============= RISK ASSESSMENTS =============
  http.get(`${API_BASE}/api/users/risk-assessments`, ({ request }) => {
    if (!request.headers.get("Authorization")) {
      return HttpResponse.json(mockUnauthorized, { status: 401 });
    }
    return HttpResponse.json(mockRiskAssessments);
  }),

  // ============= INTEGRATIONS =============
  http.get(`${API_BASE}/api/users/integration`, ({ request }) => {
    if (!request.headers.get("Authorization")) {
      return HttpResponse.json(mockUnauthorized, { status: 401 });
    }
    return HttpResponse.json(mockIntegrations);
  }),

  http.post(`${API_BASE}/api/users/integration`, async ({ request }) => {
    if (!request.headers.get("Authorization")) {
      return HttpResponse.json(mockUnauthorized, { status: 401 });
    }

    const body = await request.json();
    return HttpResponse.json({
      status: 201,
      data: { id: "new-integration", ...body },
    });
  }),

  // ============= NOTIFICATIONS =============
  http.get(`${API_BASE}/api/notifications`, () => {
    return HttpResponse.json(mockNotifications);
  }),

  // ============= HEALTH =============
  http.get(`${API_BASE}/api/users/health`, () => {
    return HttpResponse.json(mockHealth);
  }),

  http.get(`${API_BASE}/api/ingestion/health`, () => {
    return HttpResponse.json(mockHealth);
  }),

  // ============= ERROR SCENARIOS =============
  // 403 Forbidden endpoint (for testing feature unavailable)
  http.get(`${API_BASE}/api/users/restricted`, () => {
    return HttpResponse.json(mockForbidden, { status: 403 });
  }),

  // 500 Server error endpoint
  http.get(`${API_BASE}/api/users/error`, () => {
    return HttpResponse.json(mockErrorResponse(500, "Internal server error"), {
      status: 500,
    });
  }),
];

/**
 * Setup MSW server for testing
 * This runs in Node.js environment (vitest)
 */
export const server = setupServer(...handlers);
