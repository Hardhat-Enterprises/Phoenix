import { useEffect, useMemo, useState } from "react";
import {
  getApiHealth,
  getHazards,
  getRisks,
  getThreats,
} from "./services/phoenixApi";
import "./Dashboard.css";

const formatLabel = (value) =>
  String(value || "Unknown")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const severityClassFor = (value) => {
  const normalized = String(value || "").toLowerCase();

  if (normalized.includes("critical") || normalized.includes("high")) {
    return "unsafe";
  }

  if (normalized.includes("medium") || normalized.includes("investigating")) {
    return "unverified";
  }

  return "safe";
};

const barClassFor = (value) => {
  const normalized = String(value || "").toLowerCase();

  if (normalized.includes("critical")) {
    return "critical";
  }

  if (normalized.includes("high")) {
    return "high";
  }

  if (normalized.includes("medium")) {
    return "medium";
  }

  return "low";
};

const riskValueFor = (riskLevel, confidenceScore) => {
  const numericConfidence = Number(confidenceScore);

  if (Number.isFinite(numericConfidence) && numericConfidence > 0) {
    return Math.min(100, Math.round(numericConfidence <= 1 ? numericConfidence * 100 : numericConfidence));
  }

  const normalized = String(riskLevel || "").toLowerCase();

  if (normalized.includes("critical")) {
    return 100;
  }

  if (normalized.includes("high")) {
    return 80;
  }

  if (normalized.includes("medium")) {
    return 55;
  }

  if (normalized.includes("low")) {
    return 30;
  }

  return 15;
};

const normalizeThreatRow = (threat, index) => {
  const vulnerability = formatLabel(threat.risk_level || threat.severity || "Unknown");

  return {
    id: threat.threat_id || threat.id || threat.title || `threat-${index}`,
    name: threat.title || threat.threat_type || "Untitled threat",
    vulnerability,
    status: formatLabel(threat.status || "Unknown"),
    className: severityClassFor(vulnerability),
    description: threat.description || "No description was provided by the backend.",
    source: threat.category || threat.threat_type || "Phoenix API",
    region: threat.region || threat.location || "Not supplied",
    riskValue: riskValueFor(vulnerability, threat.confidence_score),
    detectedAt: threat.detected_at || threat.created_at,
    raw: threat,
  };
};

const normalizeHazardRow = (hazard, index) => ({
  id: hazard.hazard_event_id || hazard.id || hazard.hazard_type || `hazard-${index}`,
  type: formatLabel(hazard.hazard_type || "Hazard"),
  severity: formatLabel(hazard.severity_level || "Unknown"),
  status: formatLabel(hazard.event_status || "Unknown"),
});

function Dashboard({ setPage, setSelectedThreat }) {
  const [apiStatus, setApiStatus] = useState("Checking");
  const [threats, setThreats] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [riskTotal, setRiskTotal] = useState("Checking");
  const [threatTotal, setThreatTotal] = useState("Checking");
  const [hazardTotal, setHazardTotal] = useState("Checking");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadDashboardData = async () => {
      setIsLoading(true);
      setLoadError("");

      const results = await Promise.allSettled([
        getApiHealth(),
        getThreats({ page: 1, limit: 5 }),
        getHazards({ page: 1, limit: 4 }),
        getRisks({ page: 1, limit: 1 }),
      ]);

      if (!isActive) {
        return;
      }

      const [healthResult, threatsResult, hazardsResult, risksResult] = results;

      setApiStatus(healthResult.status === "fulfilled" ? "Online" : "Unavailable");

      if (threatsResult.status === "fulfilled") {
        setThreats(threatsResult.value.items);
        setThreatTotal(threatsResult.value.total);
      } else {
        setThreats([]);
        setThreatTotal("API error");
      }

      if (hazardsResult.status === "fulfilled") {
        setHazards(hazardsResult.value.items);
        setHazardTotal(hazardsResult.value.total);
      } else {
        setHazards([]);
        setHazardTotal("API error");
      }

      if (risksResult.status === "fulfilled") {
        setRiskTotal(risksResult.value.total);
      } else {
        setRiskTotal("API error");
      }

      const allDataRequestsFailed = [threatsResult, hazardsResult].every(
        (result) => result.status === "rejected",
      );

      if (healthResult.status === "rejected" && allDataRequestsFailed) {
        setLoadError(
          "Could not reach the Phoenix API gateway. Check that Docker is running and the gateway is available on localhost:3001.",
        );
      }

      setIsLoading(false);
    };

    loadDashboardData();

    return () => {
      isActive = false;
    };
  }, []);

  const overviewCards = useMemo(
    () => [
      { label: "API Status", value: apiStatus },
      { label: "Total Hazards", value: hazardTotal },
      { label: "Total Threats", value: threatTotal },
      { label: "Total Risks", value: riskTotal },
    ],
    [apiStatus, hazardTotal, riskTotal, threatTotal],
  );

  const itemRows = useMemo(() => threats.map(normalizeThreatRow), [threats]);
  const hazardRows = useMemo(() => hazards.map(normalizeHazardRow), [hazards]);

  const chartRows = useMemo(() => {
    return itemRows.map((threat) => ({
      id: threat.id,
      name: threat.name,
      severity: threat.vulnerability,
      riskValue: threat.riskValue,
    }));
  }, [itemRows]);

  const hasThreatData = chartRows.length > 0;

  return (
    <div className="dashboard-page">
      <main className="dashboard-content">
        <div className="dashboard-main-area">
          {loadError && (
            <div className="backend-status-message" role="alert">
              {loadError}
            </div>
          )}

          <section className="overview-grid" aria-label="Dashboard overview">
            {overviewCards.map((card) => (
              <div className="overview-card" key={card.label}>
                <span className="overview-label">{card.label}</span>
                <strong className="overview-value">
                  {isLoading && card.value === undefined ? "..." : card.value ?? "-"}
                </strong>
              </div>
            ))}
          </section>

          <section className="map-card">
            <div className="map-header">
              <h2>Risk Map</h2>
              <p>
                Hazard data is now loaded from the Phoenix backend. The map
                component can use these same hazard records when it is ready.
              </p>
            </div>

            <div className="map-placeholder">
              {hazardRows.length > 0 ? (
                <div className="map-hazard-list">
                  {hazardRows.map((hazard) => (
                    <div className="map-hazard-row" key={hazard.id}>
                      <strong>{hazard.type}</strong>
                      <span>{hazard.severity}</span>
                      <span>{hazard.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="map-box">
                  <span>{isLoading ? "Loading backend hazards..." : "No hazard data returned yet"}</span>
                </div>
              )}
            </div>
          </section>

          <section className="threat-chart-section">
            <div className="threat-chart-header">
              <div>
                <h2>Threat Chart</h2>
                <p>Loaded from the public Phoenix threats endpoint.</p>
              </div>

              <span className="backend-ready-badge">
                {isLoading ? "Loading" : apiStatus}
              </span>
            </div>

            <div className="threat-chart-body">
              {hasThreatData ? (
                <div className="threat-chart-list">
                  {chartRows.map((threat) => (
                    <div className="threat-row" key={threat.id}>
                      <span className="threat-name">{threat.name}</span>

                      <div className="threat-bar-track">
                        <div
                          className={`threat-bar ${barClassFor(threat.severity)}`}
                          style={{ width: `${threat.riskValue}%` }}
                        />
                      </div>

                      <span className="threat-value">
                        {threat.count ? `${threat.count}` : `${threat.riskValue}%`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-chart-placeholder">
                  <div className="chart-area">
                    <div className="chart-grid-line line-1"></div>
                    <div className="chart-grid-line line-2"></div>
                    <div className="chart-grid-line line-3"></div>

                    <div className="chart-bar high-bar"></div>
                    <div className="chart-bar medium-bar"></div>
                    <div className="chart-bar low-bar"></div>
                  </div>

                  <div className="empty-chart-text">
                    <strong>{isLoading ? "Loading threat data" : "No threat data returned yet"}</strong>
                    <span>
                      The frontend is connected to the backend endpoint and will
                      display records as soon as the API returns them.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="threat-chart-footer">
              <div>
                <strong>Backend source:</strong>
                <span> /api/users/threats</span>
              </div>

              <div className="severity-legend">
                <span className="legend-dot high"></span>
                <span>High</span>

                <span className="legend-dot medium"></span>
                <span>Medium</span>

                <span className="legend-dot low"></span>
                <span>Low</span>
              </div>
            </div>
          </section>

          <section className="item-list-card">
            <div className="item-list-header">
              <h2>Item List</h2>
              <button
                type="button"
                className="view-all-button"
                onClick={() => setPage("alerts")}
              >
                View All
              </button>
            </div>

            <div className="item-list-table">
              <div className="item-list-table-head">
                <span>Item</span>
                <span>Vulnerability</span>
                <span>Status</span>
              </div>

              {itemRows.length > 0 ? (
                itemRows.map((item) => (
                  <div
                    className="item-list-row"
                    key={item.id}
                    onClick={() => {
                      setSelectedThreat(item);
                      setPage("threats");
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setSelectedThreat(item);
                        setPage("threats");
                      }
                    }}
                  >
                    <div className="item-name-cell">
                      <span className="item-check-box">OK</span>
                      <span>{item.name}</span>
                    </div>

                    <div className={`status-pill ${item.className}`}>
                      {item.vulnerability}
                    </div>

                    <div className="status-right-cell">
                      <div className={`status-pill ${item.className}`}>
                        {item.status}
                      </div>
                      <span className="row-arrow">&gt;</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="item-list-empty">
                  {isLoading ? "Loading backend threats..." : "No threat records returned yet."}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
