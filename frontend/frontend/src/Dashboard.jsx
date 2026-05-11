import "./Dashboard.css";

function Dashboard({ setPage, setSelectedThreat }) {
  const threatData = [];

  const itemRows = [
    {
      id: 1,
      name: "Emergency Donation Scam",
      vulnerability: "High",
      status: "Active",
      className: "unsafe",
      description: "Fake donation campaign targeting bushfire victims through malicious SMS links.",
      source: "SMS Campaign",
      region: "Victoria",
    },
    {
      id: 2,
      name: "Evacuation Alert Spoof",
      vulnerability: "Medium",
      status: "Investigating",
      className: "unverified",
      description: "Fraudulent emergency evacuation notifications sent through email.",
      source: "Email",
      region: "NSW",
    },
    {
      id: 3,
      name: "Flood Relief Login Scam",
      vulnerability: "Critical",
      status: "Escalated",
      className: "unsafe",
      description: "Credential harvesting portal impersonating official flood relief services.",
      source: "Fake Website",
      region: "Queensland",
    },
  ];

  const hasThreatData = threatData.length > 0;

  return (
    <div className="dashboard-page">
      <main className="dashboard-content">
        <div className="dashboard-main-area">

          {/* Map Section */}
          <section className="map-card">
            <div className="map-header">
              <h2>Risk Map</h2>
              <p>
                This area is reserved for a future map component
                (e.g. bushfire and incident locations).
              </p>
            </div>

            <div className="map-placeholder">
              <div className="map-box">
                <span>Map Component Coming Soon</span>
              </div>
            </div>
          </section>

          {/* Threat Chart */}
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

          {/* Item List Section */}
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
                <div
                  className="item-list-row"
                  key={item.id}
                  onClick={() => {
                    setSelectedThreat(item);
                    setPage("threatdetails");
                  }}
                  style={{ cursor: "pointer" }}
                >
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