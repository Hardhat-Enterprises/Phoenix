import React from "react";
import "./ThreatDetails.css";

const threatLevels = [
  { label: "No Threat", className: "no-threat" },
  { label: "Low", className: "low" },
  { label: "Medium", className: "medium" },
  { label: "High", className: "high" },
  { label: "Critical", className: "critical" },
];

function ThreatDetails({ selectedThreat }) {
  const getRiskColor = () => {
    if (!selectedThreat) {
      return "#2b9348";
    }

    if (selectedThreat.vulnerability === "Critical") {
      return "#d93636";
    }

    if (selectedThreat.vulnerability === "High") {
      return "#e85d04";
    }

    if (selectedThreat.vulnerability === "Medium") {
      return "#d4a017";
    }

    if (selectedThreat.vulnerability === "Low") {
      return "#84cc16";
    }

    return "#2b9348";
  };

  return (
    <div className="threat-details-page">
      {/* Left Side: Hub Legend */}
      <div className="threat-legend-card">
        <h3 className="threat-legend-title">HUB LEGEND</h3>

        {threatLevels.map((level) => (
          <div className="threat-legend-row" key={level.label}>
            <span className={`legend-dot ${level.className}`}></span>
            <span>{level.label}</span>
          </div>
        ))}
      </div>

      {/* Right Side: Threat Details */}
      <main className="threat-details-main">
        <div className="threat-details-card">
          <div className="threat-details-header">
            <h1>Threat Details</h1>
            <p>Detailed cybersecurity threat intelligence and incident overview</p>
          </div>

          {!selectedThreat ? (
            <div className="no-threat-selected-box">
              <h2>No Threat Selected</h2>
              <p>
                Please select a threat from the alerts page to view its details.
              </p>
            </div>
          ) : (
            <div className="selected-threat-box">
              <h2>{selectedThreat.name}</h2>

              <div className="threat-info-grid">
                <div>
                  <strong>Threat Level</strong>

                  <div
                    className="threat-risk-badge"
                    style={{ color: getRiskColor() }}
                  >
                    {selectedThreat.vulnerability}
                  </div>
                </div>

                <div>
                  <strong>Status</strong>
                  <p>{selectedThreat.status}</p>
                </div>

                <div>
                  <strong>Source</strong>
                  <p>{selectedThreat.source}</p>
                </div>

                <div>
                  <strong>Region</strong>
                  <p>{selectedThreat.region}</p>
                </div>
              </div>

              <div className="threat-description-section">
                <strong>Threat Description</strong>
                <p>{selectedThreat.description}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ThreatDetails;