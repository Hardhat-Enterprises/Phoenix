import { useEffect, useMemo, useState } from "react";
import {
  getApiHealth,
  getHazards,
  getRisks,
  getThreats,
  getIngestionHealth,
  getStorageHealth,
} from "./services/phoenixApi";
import "./Dashboard.css";

const formatLabel = (value) =>
  String(value || "Unknown")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const severityClassFor = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("critical") || normalized.includes("high")) return "unsafe";
  if (normalized.includes("medium") || normalized.includes("investigating")) return "unverified";
  return "safe";
};

const barClassFor = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("critical")) return "critical";
  if (normalized.includes("high")) return "high";
  if (normalized.includes("medium")) return "medium";
  return "low";
};

const riskValueFor = (riskLevel, confidenceScore) => {
  const numericConfidence = Number(confidenceScore);
  if (Number.isFinite(numericConfidence) && numericConfidence > 0) {
    return Math.min(100, Math.round(numericConfidence <= 1 ? numericConfidence * 100 : numericConfidence));
  }
  const normalized = String(riskLevel || "").toLowerCase();
  if (normalized.includes("critical")) return 100;
  if (normalized.includes("high")) return 80;
  if (normalized.includes("medium")) return 55;
  if (normalized.includes("low")) return 30;
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
  const [ingestionStatus, setIngestionStatus] = useState("Checking");
  const [storageStatus, setStorageStatus] = useState("Checking");
  const [threats, setThreats] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [riskTotal, setRiskTotal] = useState("Checking");
  const [threatTotal, setThreatTotal] = useState("Checking");
  const [hazardTotal, setHazardTotal] = useState("Checking");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("Sydney");
  const [loadingDetection, setLoadingDetection] = useState(false);
  const [apiResult, setApiResult] = useState(null);

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
        getIngestionHealth(),
        getStorageHealth(),
      ]);

      if (!isActive) return;

      const [
        healthResult,
        threatsResult,
        hazardsResult,
        risksResult,
        ingestionResult,
        storageResult,
      ] = results;

      setApiStatus(healthResult.status === "fulfilled" ? "Online" : "Unavailable");
      setIngestionStatus(ingestionResult.status === "fulfilled" ? "Running" : "Unavailable");
      setStorageStatus(storageResult.status === "fulfilled" ? "Running" : "Unavailable");

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
        (result) => result.status === "rejected"
      );

      if (healthResult.status === "rejected" && allDataRequestsFailed) {
        setLoadError(
          "Could not reach the Phoenix API gateway. Check that Docker is running and the gateway is available on localhost:3001."
        );
      }

      setIsLoading(false);
    };

    loadDashboardData();
    return () => { isActive = false; };
  }, []);

  const overviewCards = useMemo(
    () => [
      { label: "API Status", value: apiStatus },
      { label: "User Service", value: apiStatus === "Online" ? "Running" : "Unavailable" },
      { label: "Ingestion Service", value: ingestionStatus },
      { label: "Storage Service", value: storageStatus },
      { label: "Total Hazards", value: hazardTotal },
      { label: "Total Threats", value: threatTotal },
      { label: "Total Risks", value: riskTotal },
    ],
    [apiStatus, ingestionStatus, storageStatus, hazardTotal, riskTotal, threatTotal]
  );

  const itemRows = useMemo(() => threats.map(normalizeThreatRow), [threats]);
  const hazardRows = useMemo(() => hazards.map(normalizeHazardRow), [hazards]);
  const chartRows = useMemo(() => itemRows.map((threat) => ({
    id: threat.id,
    name: threat.name,
    severity: threat.vulnerability,
    riskValue: threat.riskValue,
  })), [itemRows]);

  const hasThreatData = chartRows.length > 0;

  const getThreatLevel = (score) => {
    if (score <= 0.2) return "Minimal";
    if (score <= 0.4) return "Low";
    if (score <= 0.6) return "Moderate";
    if (score <= 0.8) return "High";
    return "Critical";
  };

  const runDetection = async () => {
    try {
      setLoadingDetection(true);
      const timestamp = new Date().toISOString();
      const response = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: selectedLocation, timestamp }),
      });
      if (!response.ok) throw new Error("Detection API failed");
      const data = await response.json();
      setApiResult(data);
    } catch (error) {
      console.error("Detection error:", error);
    } finally {
      setLoadingDetection(false);
    }
  };

  return (
    <div className="dashboard-page">
      <main className="dashboard-content">
        <div className="dashboard-main-area">

          {loadError && (
            <div className="backend-status-message" role="alert">
              {loadError}
            </div>
          )}

          {/* Status Cards — Goutham */}
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

          {/* Regional Anomaly Detection Section (Jack) */}
          <section className="ai-detection-card" style={{ display: "flex", justifyContent: "space-between", gap: "24px", padding: "20px", border: "1px solid #ddd", borderRadius: "12px", marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <h2>Regional Anomaly Detection</h2>
              <p>Run the AI anomaly detection model against a selected Australian region.</p>
              <label>Select Australian Location</label>
              <select
                value={selectedLocation}
                onChange={(event) => setSelectedLocation(event.target.value)}
                style={{ padding: "10px", borderRadius: "8px", width: "220px", marginTop: "8px" }}
              >
                <option value="Sydney">Sydney</option>
                <option value="Melbourne">Melbourne</option>
                <option value="Perth">Perth</option>
                <option value="Brisbane">Brisbane</option>
                <option value="Adelaide">Adelaide</option>
              </select>
              <br /><br />
              <button type="button" className="view-all-button" onClick={runDetection} disabled={loadingDetection}>
                {loadingDetection ? "Running Detection..." : "Run Detection"}
              </button>
            </div>
            <div style={{ flex: 1, borderLeft: "1px solid #eee", paddingLeft: "20px" }}>
              <h3>Detection Output</h3>
              {!apiResult ? (
                <p>No detection has been run yet.</p>
              ) : (
                <>
                  <p><strong>Location:</strong> {apiResult.location}</p>
                  <p><strong>Anomaly Score:</strong> {Number(apiResult.score).toFixed(2)}</p>
                  <p><strong>Threat Level:</strong> {getThreatLevel(apiResult.score)}</p>
                  <p><strong>Timestamp:</strong> {apiResult.timestamp}</p>
                </>
              )}
            </div>
          </section>

          {/* Risk Map Section (Jack) */}
          <section className="map-card">
            <div className="map-header">
              <h2>Risk Map</h2>
              <p>Hazard data is now loaded from the Phoenix backend. The map component can use these same hazard records when it is ready.</p>
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

          {/* Threat Chart Section (Sathvik) */}
          <section className="threat-chart-section">
            <div className="threat-chart-header">
              <div>
                <h2>Threat Chart</h2>
                <p>Loaded from the public Phoenix threats endpoint.</p>
              </div>
              <span className="backend-ready-badge">{isLoading ? "Loading" : apiStatus}</span>
            </div>
            <div className="threat-chart-body">
              {hasThreatData ? (
                <div className="threat-chart-list">
                  {chartRows.map((threat) => (
                    <div className="threat-row" key={threat.id}>
                      <span className="threat-name">{threat.name}</span>
                      <div className="threat-bar-track">
                        <div className={`threat-bar ${barClassFor(threat.severity)}`} style={{ width: `${threat.riskValue}%` }} />
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
                    <span>The frontend is connected to the backend endpoint and will display records as soon as the API returns them.</span>
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
                <span className="legend-dot high"></span><span>High</span>
                <span className="legend-dot medium"></span><span>Medium</span>
                <span className="legend-dot low"></span><span>Low</span>
              </div>
            </div>
          </section>

          {/* Item List Section (Manaal) */}
          <section className="item-list-card">
            <div className="item-list-header">
              <h2>Item List</h2>
              <button type="button" className="view-all-button" onClick={() => setPage("alerts")}>
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
                    onClick={() => { setSelectedThreat(item); setPage("threats"); }}
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
                    <div className={`status-pill ${item.className}`}>{item.vulnerability}</div>
                    <div className="status-right-cell">
                      <div className={`status-pill ${item.className}`}>{item.status}</div>
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