/**
 * Test fixtures and mock data
 * These represent realistic API responses from the backend
 */

export const mockUser = {
  id: "user-1",
  username: "testuser",
  email: "test@example.com",
  role: "admin",
};

export const mockAuthResponse = {
  status: 200,
  message: "Login successful",
  data: [
    {
      access_token: "mock-jwt-token-abc123",
      accessToken: "mock-jwt-token-abc123",
      user: mockUser,
    },
  ],
};

export const mockAuthSession = {
  accessToken: "mock-jwt-token-abc123",
  user: mockUser,
};

export const mockThreat = {
  id: "threat-1",
  threat_id: "threat-1",
  title: "Suspicious Login Activity",
  description: "Multiple failed login attempts detected",
  severity: "high",
  threat_type: "unauthorized_access",
  source: "auth-service",
  confidence_score: 0.95,
  timestamp: "2024-01-15T10:30:00Z",
  raw: {
    threat_id: "threat-1",
    threat_type: "unauthorized_access",
    severity: "high",
    event_type: "login_failure",
    source: "auth-service",
    confidence_score: 0.95,
  },
};

export const mockThreatList = {
  status: 200,
  data: [
    mockThreat,
    {
      id: "threat-2",
      threat_id: "threat-2",
      title: "Data Exfiltration Detected",
      severity: "critical",
      threat_type: "data_exfiltration",
    },
    {
      id: "threat-3",
      threat_id: "threat-3",
      title: "Malware Signature Match",
      severity: "medium",
      threat_type: "malware",
    },
  ],
  total: 3,
  page: 1,
  limit: 10,
};

export const mockHazard = {
  id: "hazard-1",
  hazard_id: "hazard-1",
  title: "Fire Risk",
  description: "Elevated fire risk in region",
  severity: "medium",
  location: "NSW",
};

export const mockHazardList = {
  status: 200,
  data: [mockHazard],
  total: 1,
  page: 1,
  limit: 10,
};

export const mockDashboardOverview = {
  status: 200,
  data: {
    total_threats: 42,
    critical_threats: 3,
    active_incidents: 5,
    system_status: "operational",
  },
};

export const mockDashboardCharts = {
  status: 200,
  data: {
    threat_timeline: [
      { date: "2024-01-01", count: 5 },
      { date: "2024-01-02", count: 8 },
    ],
    severity_distribution: {
      critical: 3,
      high: 12,
      medium: 20,
      low: 30,
    },
  },
};

export const mockDashboardActivity = {
  status: 200,
  data: [
    {
      id: "activity-1",
      type: "threat_detected",
      description: "New threat detected",
      timestamp: "2024-01-15T10:30:00Z",
    },
    {
      id: "activity-2",
      type: "incident_resolved",
      description: "Incident resolved",
      timestamp: "2024-01-15T09:15:00Z",
    },
  ],
};

export const mockNotifications = {
  status: 200,
  notifications: [
    {
      id: "1",
      title: "Critical Threat",
      message: "New critical threat detected",
      severity: "critical",
      timestamp: "2024-01-15T10:30:00Z",
    },
    {
      id: "2",
      title: "System Update",
      message: "System maintenance scheduled",
      severity: "info",
      timestamp: "2024-01-15T09:00:00Z",
    },
  ],
  total: 2,
  page: 1,
  limit: 10,
};

export const mockIntegration = {
  id: "integration-1",
  name: "External API",
  type: "webhook",
  status: "active",
  input: JSON.stringify({ format: "json" }),
  output: JSON.stringify({ status: "success" }),
};

export const mockIntegrations = {
  status: 200,
  data: [mockIntegration],
  total: 1,
};

export const mockRiskAssessment = {
  id: "risk-1",
  title: "Critical Infrastructure Vulnerability",
  description: "Unpatched vulnerability in production database server",
  severity: "critical",
  type: "vulnerability",
  status: "active",
  source: "vulnerability-scanner",
  timestamp: "2024-01-15T10:00:00Z",
};

export const mockRiskAssessments = {
  status: 200,
  data: [mockRiskAssessment],
  total: 1,
  page: 1,
  limit: 10,
};

export const mockHealth = {
  status: 200,
  message: "Service healthy",
  data: {
    uptime: "99.9%",
  },
};

export const mockErrorResponse = (
  status = 500,
  message = "Internal server error",
) => ({
  status,
  message,
  data: null,
});

export const mockUnauthorized = {
  status: 401,
  message: "Invalid token",
};

export const mockForbidden = {
  status: 403,
  message: "Access denied",
};

export const mockNotFound = {
  status: 404,
  message: "Resource not found",
};
