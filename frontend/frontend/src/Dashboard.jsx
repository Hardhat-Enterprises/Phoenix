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

  return (
    <div className="dashboard-page">
      <Sidebar setPage={setPage} />

      <main className="dashboard-content">
        <div className="dashboard-main-area">

          //Threat Chart Section - Sathvik
          <section className="threat-chart-section">
            <div className="threat-chart-header">
              <div>
                <h2>Threat Chart</h2>
                <p>
                  This section is prepared for future backend threat data.
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
                        ></div>
                      </div>

                      <span className="threat-value">
                        {threat.riskValue}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-chart-placeholder">
                  <p>No threat data connected yet</p>
                </div>
              )}
            </div>
          </section>

          //Item List Section
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