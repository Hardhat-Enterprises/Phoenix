import { useState } from "react";

import Sidebar from "./components/Sidebar";
import "./Dashboard.css";

function Dashboard({ setPage }) {

  //Anomaly detection state
  const [selectedLocation, setSelectedLocation] = useState("Sydney");
  const [loading, setLoading] = useState(false);
  const [apiResult, setApiResult] = useState(null);

  const threatData = [];

  const itemRows = [
    {
      id: 1,
      name: "Item 1",
      vulnerability: "Safe",
      status: "Safe",
      className: "safe",
    },
    {
      id: 2,
      name: "Item 2",
      vulnerability: "Unverified",
      status: "Unverified",
      className: "unverified",
    },
    {
      id: 3,
      name: "Item 3",
      vulnerability: "Unsafe",
      status: "Unsafe",
      className: "unsafe",
    },
  ];

  const hasThreatData = threatData.length > 0;

  //Score mapping function
  const getThreatLevel = (score) => {
    if (score <= 0.2) return "Minimal";
    if (score <= 0.4) return "Low";
    if (score <= 0.6) return "Moderate";
    if (score <= 0.8) return "High";
    return "Critical";
  };

  //API Call function
  const runDetection = async () => {
    try {
      setLoading(true);

      const timestamp = new Date().toISOString();

      const response = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location: selectedLocation,
          timestamp,
        }),
      });

      if (!response.ok) throw new Error("API failed");

      const data = await response.json();
      setApiResult(data);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-page">

      <main className="dashboard-content">
        <div className="dashboard-main-area">

          <section
            className="ai-detection-card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "24px",
              padding: "20px",
              border: "1px solid #ddd",
              borderRadius: "12px",
              marginBottom: "20px",
            }}
          >

            {/* Left: controls */}
            <div style={{ flex: 1 }}>
              <h2>Regional Anomaly Detection</h2>

              <label>Select Australian Location</label>

              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  width: "220px",
                  marginTop: "8px",
                }}
              >
                <option value="Sydney">Sydney</option>
                <option value="Melbourne">Melbourne</option>
                <option value="Perth">Perth</option>
                <option value="Brisbane">Brisbane</option>
                <option value="Adelaide">Adelaide</option>
              </select>

              <br /><br />

              <button
                onClick={runDetection}
                disabled={loading}
                className="view-all-button"
              >
                {loading ? "Running Detection..." : "Run Detection"}
              </button>
            </div>

            {/* Right: output */}
            <div
              style={{
                flex: 1,
                borderLeft: "1px solid #eee",
                paddingLeft: "20px",
              }}
            >
              <h3>Detection Output</h3>

              {!apiResult ? (
                <p>No result yet. Run detection to see output.</p>
              ) : (
                <>
                  <p>
                    <strong>Location:</strong> {apiResult.location}
                  </p>

                  <p>
                    <strong>Score:</strong>{" "}
                    {apiResult.score.toFixed(2)}
                  </p>

                  <p>
                    <strong>Threat Level:</strong>{" "}
                    {getThreatLevel(apiResult.score)}
                  </p>

                  <p>
                    <strong>Timestamp:</strong>{" "}
                    {apiResult.timestamp}
                  </p>
                </>
              )}
            </div>

          </section>

          {/* Map Section (Jack) */}
          <section className="map-card">
            <div className="map-header">
              <h2>Risk Map</h2>
              <p>
                This area is reserved for a future map component
                (e.g. Bushire and incident locations).
              </p>
            </div>

            <div className="map-placeholder">
              <div className="map-box">
                <span>Map Component Coming Soon</span>
              </div>
            </div>
          </section>

          {/* Threat Chart (Sathvik) */}
          <section className="threat-chart-section">
            <div className="threat-chart-header">
              <div>
                <h2>Threat Chart</h2>
                <p>
                  This section is prepared for future backend threat and scan result
                  data.
                </p>
              </div>

              <span className="backend-ready-badge">Backend Ready</span>
            </div>

            <div className="threat-chart-body">
              {hasThreatData ? (
                <div className="threat-chart-list">
                  {threatData.map((threat) => (
                    <div className="threat-row" key={threat.id}>
                      <span className="threat-name">{threat.name}</span>

                      <div className="threat-bar-track">
                        <div
                          className={`threat-bar ${threat.severity.toLowerCase()}`}
                          style={{ width: `${threat.riskValue}%` }}
                        />
                      </div>

                      <span className="threat-value">
                        {threat.riskValue}%
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
                    <strong>No threat data connected yet</strong>
                    <span>
                      Backend teams can later attach threat names, severity levels,
                      scan results, affected items and risk values here.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="threat-chart-footer">
              <div>
                <strong>Expected backend fields:</strong>
                <span>
                  {" "}
                  threat name, threat source, affected item, severity, scan result
                  and risk value
                </span>
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

          {/* Item List Section (Manaal) */}
          <section className="item-list-card">
            <div className="item-list-header">
              <h2>Item List</h2>
              <button type="button" className="view-all-button">
                View All
              </button>
            </div>

            <div className="item-list-table">
              <div className="item-list-table-head">
                <span>Item</span>
                <span>Vulnerability</span>
                <span>Status</span>
              </div>

              {itemRows.map((item) => (
                <div className="item-list-row" key={item.id}>
                  <div className="item-name-cell">
                    <span className="item-check-box">✓</span>
                    <span>{item.name}</span>
                  </div>

                  <div className={`status-pill ${item.className}`}>
                    {item.vulnerability}
                  </div>

                  <div className="status-right-cell">
                    <div className={`status-pill ${item.className}`}>
                      {item.status}
                    </div>
                    <span className="row-arrow">›</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

export default Dashboard;