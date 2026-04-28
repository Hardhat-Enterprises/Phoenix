import Sidebar from "./components/Sidebar";
import "./Dashboard.css";

function Dashboard({ setPage }) {
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

  const styles = {
    card: {
      backgroundColor: "#ffffff",
      borderRadius: "20px",
      padding: "18px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
      border: "1px solid #e8edf5",
    },

    title: {
      margin: "0 0 10px 0",
      fontSize: "16px",
      fontWeight: "700",
      color: "#11264d",
      textAlign: "left",
    },

    placeholder: {
      height: "180px",
      backgroundColor: "#eef3fb",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#5a6b85",
      fontSize: "16px",
      textAlign: "center",
    },

    addAlertCard: {
      backgroundColor: "#ffffff",
      borderRadius: "18px",
      padding: "20px",
      boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
      border: "1px solid #e6ecf5",
      display: "flex",
      flexDirection: "column",
      minHeight: "250px",
    },

    addAlertContent: {
      textAlign: "left",
    },

    addAlertTitle: {
      margin: "0 0 14px 0",
      fontSize: "18px",
      fontWeight: "700",
      color: "#0f2a55",
      textAlign: "left",
      lineHeight: "1.4",
    },

    addAlertList: {
      margin: 0,
      paddingLeft: "20px",
      color: "#4a5f7a",
      fontSize: "14px",
      lineHeight: "1.7",
      textAlign: "left",
    },

    addAlertListItem: {
      marginBottom: "10px",
    },

    addAlertButtonWrap: {
      marginTop: "auto",
      display: "flex",
      justifyContent: "flex-end",
      paddingTop: "18px",
    },

    addAlertButton: {
      backgroundColor: "#1f8fff",
      color: "#ffffff",
      border: "none",
      borderRadius: "10px",
      padding: "10px 18px",
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
    },
  };

  return (
    <div className="dashboard-page">
      <Sidebar setPage={setPage} />

      <main className="dashboard-content">
        <div className="dashboard-main-area">

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

                      <span className="threat-value">{threat.riskValue}%</span>
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

          <section style={styles.card}>
            <h3 style={styles.title}>Risk Trend</h3>
            <div style={styles.placeholder}>Chart Placeholder</div>
          </section>

          <section style={styles.card}>
            <h3 style={styles.title}>Risk by Location</h3>
            <div style={styles.placeholder}>Map Placeholder</div>
          </section>

          <section style={styles.addAlertCard}>
            <div style={styles.addAlertContent}>
              <h3 style={styles.addAlertTitle}>
                Add Threat and Alert Source
              </h3>

              <ul style={styles.addAlertList}>
                <li style={styles.addAlertListItem}>
                  Allow users to submit threat sources
                </li>
                <li style={styles.addAlertListItem}>
                  Support both URL and file upload
                </li>
                <li style={styles.addAlertListItem}>
                  Includes metadata for risk classification
                </li>
              </ul>
            </div>

            <div style={styles.addAlertButtonWrap}>
              <button
                style={styles.addAlertButton}
                onClick={() => {}}
              >
                Add Alert
              </button>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

export default Dashboard;
