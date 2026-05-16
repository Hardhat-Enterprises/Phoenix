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
    const level = selectedThreat?.vulnerability?.toLowerCase();

    if (level?.includes("critical")) return "#d93636";
    if (level?.includes("high")) return "#e85d04";
    if (level?.includes("medium")) return "#d4a017";
    if (level?.includes("low")) return "#84cc16";

    return "#2b9348";
  };

  const rawThreat = selectedThreat?.raw || {};
  const confidenceScore =
    rawThreat.confidence_score || selectedThreat?.confidence_score || "Not supplied";

  const detectedAt =
    selectedThreat?.detectedAt ||
    rawThreat.detected_at ||
    rawThreat.created_at ||
    "Not supplied";

  return (
    <div className="threat-details-page">
      <div className="threat-legend-card">
        <h3 className="threat-legend-title">HUB LEGEND</h3>

        {threatLevels.map((level) => (
          <div className="threat-legend-row" key={level.label}>
            <span className={`legend-dot ${level.className}`}></span>
            <span>{level.label}</span>
          </div>
        ))}
      </div>

      <main className="threat-details-main">
        <div className="threat-details-card">
          <div className="threat-details-header">
            <h1>Threat Details</h1>
            <p>Detailed cybersecurity threat intelligence and incident overview</p>
          </div>

          {!selectedThreat ? (
            <div className="no-threat-selected-box">
              <h2>No Threat Selected</h2>
              <p>Please select a threat from the dashboard item list.</p>
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
                  <strong>Category</strong>
                  <p>{rawThreat.category || selectedThreat.source}</p>
                </div>

                <div>
                  <strong>Confidence Score</strong>
                  <p>{confidenceScore}</p>
                </div>

                <div>
                  <strong>Detected At</strong>
                  <p>{detectedAt}</p>
                </div>

                <div>
                  <strong>Source</strong>
                  <p>{selectedThreat.source}</p>
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