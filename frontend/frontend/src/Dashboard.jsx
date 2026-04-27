import React from "react";

const threatData = [];

function Dashboard() {
  const hasThreatData = threatData.length > 0;

  return (
    <main className="dashboard-page">
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
                    ></div>
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

      <style>{`
        .dashboard-page {
          min-height: 100vh;
          background: #f3f4f6;
          padding: 32px;
          box-sizing: border-box;
          font-family: Arial, sans-serif;
        }

        .threat-chart-section {
          width: 100%;
          max-width: 760px;
          background: #ffffff;
          border-radius: 18px;
          padding: 24px;
          box-sizing: border-box;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
        }

        .threat-chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 18px;
        }

        .threat-chart-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }

        .threat-chart-header p {
          margin: 6px 0 0;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.4;
        }

        .backend-ready-badge {
          background: #e0f2fe;
          color: #0369a1;
          font-size: 12px;
          font-weight: 700;
          padding: 8px 12px;
          border-radius: 999px;
          white-space: nowrap;
        }

        .threat-chart-body {
          background: #f9fafb;
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          min-height: 220px;
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-chart-placeholder {
          width: 100%;
        }

        .chart-area {
          height: 145px;
          position: relative;
          border-left: 2px solid #cbd5e1;
          border-bottom: 2px solid #cbd5e1;
          margin-bottom: 18px;
          overflow: hidden;
        }

        .chart-grid-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: #e5e7eb;
        }

        .line-1 {
          top: 25%;
        }

        .line-2 {
          top: 50%;
        }

        .line-3 {
          top: 75%;
        }

        .chart-bar {
          position: absolute;
          bottom: 0;
          width: 54px;
          border-radius: 10px 10px 0 0;
          opacity: 0.82;
        }

        .high-bar {
          left: 22%;
          height: 110px;
          background: #ef4444;
        }

        .medium-bar {
          left: 46%;
          height: 78px;
          background: #f59e0b;
        }

        .low-bar {
          left: 70%;
          height: 48px;
          background: #10b981;
        }

        .empty-chart-text {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .empty-chart-text strong {
          font-size: 15px;
          color: #111827;
        }

        .empty-chart-text span {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.4;
        }

        .threat-chart-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .threat-row {
          display: grid;
          grid-template-columns: 130px 1fr 50px;
          align-items: center;
          gap: 12px;
        }

        .threat-name {
          font-size: 13px;
          color: #374151;
        }

        .threat-bar-track {
          height: 12px;
          background: #e5e7eb;
          border-radius: 999px;
          overflow: hidden;
        }

        .threat-bar {
          height: 100%;
          border-radius: 999px;
        }

        .threat-bar.high {
          background: #ef4444;
        }

        .threat-bar.medium {
          background: #f59e0b;
        }

        .threat-bar.low {
          background: #10b981;
        }

        .threat-value {
          font-size: 12px;
          color: #4b5563;
        }

        .threat-chart-footer {
          margin-top: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          font-size: 12px;
          color: #6b7280;
        }

        .threat-chart-footer strong {
          color: #111827;
        }

        .severity-legend {
          display: flex;
          align-items: center;
          gap: 7px;
          white-space: nowrap;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }

        .legend-dot.high {
          background: #ef4444;
        }

        .legend-dot.medium {
          background: #f59e0b;
        }

        .legend-dot.low {
          background: #10b981;
        }

        @media (max-width: 768px) {
          .dashboard-page {
            padding: 18px;
          }

          .threat-chart-header,
          .threat-chart-footer {
            flex-direction: column;
            align-items: flex-start;
          }

          .threat-row {
            grid-template-columns: 1fr;
            gap: 7px;
          }
        }
      `}</style>
    </main>
  );
}

export default Dashboard;