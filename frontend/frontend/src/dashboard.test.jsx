import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import Dashboard from "./Dashboard";

import {
  getApiHealth,
  getDashboardActivity,
  getDashboardCharts,
  getDashboardOverview,
  getHazards,
  getIntegrations,
  getLocations,
  getRisks,
  getThreats,
} from "./services/phoenixApi";

vi.mock("./services/phoenixApi", () => ({
  getApiHealth: vi.fn(),
  getDashboardActivity: vi.fn(),
  getDashboardCharts: vi.fn(),
  getDashboardOverview: vi.fn(),
  getHazards: vi.fn(),
  getIntegrations: vi.fn(),
  getLocations: vi.fn(),
  getRisks: vi.fn(),
  getThreats: vi.fn(),
  postIngestionAnomaly: vi.fn(),
}));

const renderDashboard = () =>
  render(
    <Dashboard
      isLoggedIn
      setPage={vi.fn()}
      setSelectedThreat={vi.fn()}
    />,
  );

const mockSuccess = () => {
  getApiHealth.mockResolvedValue({
    message: "API running",
  });

  getDashboardOverview.mockResolvedValue({
    total_hazards: 0,
    total_threats: 1,
    total_risks: 0,
  });

  getDashboardCharts.mockResolvedValue({
    threats_by_risk_level: {
      high: 1,
    },
  });

  getDashboardActivity.mockResolvedValue({
    recent_threats: [
      {
        threat_id: "test-threat",
        title: "Test phishing threat",
        threat_type: "phishing",
        risk_level: "high",
        status: "active",
        detected_at:
          "2026-09-08T01:00:00Z",
      },
    ],
  });

  getHazards.mockResolvedValue({
    items: [],
    total: 0,
  });

  getLocations.mockResolvedValue([]);

  getThreats.mockResolvedValue({
    items: [],
    total: 0,
  });

  getRisks.mockResolvedValue({
    items: [],
    total: 0,
  });

  getIntegrations.mockResolvedValue({
    items: [],
    total: 0,
  });
};

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockSuccess();
  });

  it("renders successful backend data", async () => {
    renderDashboard();

    expect(
      await screen.findByText(
        "Test phishing threat",
      ),
    ).toBeInTheDocument();
  });

  it("renders an empty threat state", async () => {
    getDashboardActivity.mockResolvedValue({
      recent_threats: [],
    });

    getThreats.mockResolvedValue({
      items: [],
      total: 0,
    });

    renderDashboard();

    expect(
      await screen.findByText(
        "No recent threat signals available.",
      ),
    ).toBeInTheDocument();
  });

  it("handles failure of both threat endpoints", async () => {
    getDashboardActivity.mockRejectedValue(
      new Error("Failed"),
    );

    getThreats.mockRejectedValue(
      new Error("Failed"),
    );

    renderDashboard();

    expect(
      await screen.findByText(
        "Unable to load recent threat signals.",
      ),
    ).toBeInTheDocument();
  });

  it("handles chart endpoint failure", async () => {
    getDashboardCharts.mockRejectedValue(
      new Error("Failed"),
    );

    renderDashboard();

    expect(
      await screen.findByText(
        "Unable to load threat chart data.",
      ),
    ).toBeInTheDocument();
  });

  it("handles map endpoint failure", async () => {
    getHazards.mockRejectedValue(
      new Error("Failed"),
    );

    getLocations.mockRejectedValue(
      new Error("Failed"),
    );

    renderDashboard();

    expect(
      await screen.findByText(
        "Unable to load risk map data.",
      ),
    ).toBeInTheDocument();
  });

  it("does not render a blank page when all services fail", async () => {
    getApiHealth.mockRejectedValue(
      new Error("Unavailable"),
    );

    getDashboardOverview.mockRejectedValue(
      new Error("Failed"),
    );
    getDashboardCharts.mockRejectedValue(
      new Error("Failed"),
    );
    getDashboardActivity.mockRejectedValue(
      new Error("Failed"),
    );
    getHazards.mockRejectedValue(
      new Error("Failed"),
    );
    getLocations.mockRejectedValue(
      new Error("Failed"),
    );
    getThreats.mockRejectedValue(
      new Error("Failed"),
    );
    getRisks.mockRejectedValue(
      new Error("Failed"),
    );
    getIntegrations.mockRejectedValue(
      new Error("Failed"),
    );

    renderDashboard();

    await waitFor(() => {
      expect(
        screen.getByText(
          /could not reach the phoenix api gateway/i,
        ),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "Regional Anomaly Detection",
      ),
    ).toBeInTheDocument();
  });
});