import "./ThreatDetails.css";

const threatLevels = [
  { label: "No Threat", className: "no-threat" },
  { label: "Low", className: "low" },
  { label: "Medium", className: "medium" },
  { label: "High", className: "high" },
  { label: "Critical", className: "critical" },
];

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const formatLabel = (value) =>
  String(value || "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatConfidence = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "";
  }

  return number <= 1 ? `${Math.round(number * 100)}%` : `${number}%`;
};

const readBackendThreat = (selectedThreat) =>
  selectedThreat?.raw?.raw || selectedThreat?.raw || {};

const buildThreatDescription = (selectedThreat) => {
  const backendThreat = readBackendThreat(selectedThreat);

  if (hasValue(selectedThreat?.description)) {
    return selectedThreat.description;
  }

  const facts = [
    hasValue(backendThreat.threat_type) &&
      `Threat type is ${formatLabel(backendThreat.threat_type)}`,
    hasValue(backendThreat.severity) &&
      `severity is ${formatLabel(backendThreat.severity)}`,
    hasValue(backendThreat.event_type) &&
      `event type is ${formatLabel(backendThreat.event_type)}`,
    hasValue(backendThreat.source) && `source is ${backendThreat.source}`,
    hasValue(backendThreat.confidence_score) &&
      `confidence is ${formatConfidence(backendThreat.confidence_score)}`,
  ].filter(Boolean);

  if (facts.length === 0) {
    return "No threat description was provided by the backend for this record.";
  }

  return `Backend threat record summary: ${facts.join(", ")}.`;
};

function ThreatDetails({ selectedThreat }) {
  const backendThreat = readBackendThreat(selectedThreat);
  const threatName =
    selectedThreat?.name ||
    formatLabel(backendThreat.threat_type) ||
    "Selected Threat";
  const threatSeverity =
    selectedThreat?.vulnerability ||
    formatLabel(backendThreat.severity) ||
    "Not provided";
  const threatStatus =
    selectedThreat?.status ||
    formatLabel(backendThreat.severity) ||
    "Not provided";
  const threatSource =
    selectedThreat?.source ||
    backendThreat.source ||
    "Not provided";
  const eventType = hasValue(backendThreat.event_type)
    ? formatLabel(backendThreat.event_type)
    : "Not provided";
  const confidence = hasValue(backendThreat.confidence_score)
    ? formatConfidence(backendThreat.confidence_score)
    : "Not provided";
  const threatDescription = buildThreatDescription(selectedThreat);

  const getRiskColor = () => {
    if (!selectedThreat) {
      return "#2b9348";
    }

    if (threatSeverity === "Critical") {
      return "#d93636";
    }

    if (threatSeverity === "High") {
      return "#e85d04";
    }

    if (threatSeverity === "Medium") {
      return "#d4a017";
    }

    if (threatSeverity === "Low") {
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
              <h2>{threatName}</h2>

              <div className="threat-info-grid">
                <div>
                  <strong>Threat Type</strong>

                  <p>{formatLabel(backendThreat.threat_type) || threatName}</p>
                </div>

                <div>
                  <strong>Severity</strong>
                  <div
                    className="threat-risk-badge"
                    style={{ color: getRiskColor() }}
                  >
                    {threatSeverity}
                  </div>
                </div>

                <div>
                  <strong>Status</strong>
                  <p>{threatStatus}</p>
                </div>

                <div>
                  <strong>Source</strong>
                  <p>{threatSource}</p>
                </div>

                <div>
                  <strong>Event Type</strong>
                  <p>{eventType}</p>
                </div>

                <div>
                  <strong>Confidence</strong>
                  <p>{confidence}</p>
                </div>
              </div>

              <div className="threat-description-section">
                <strong>Threat Description</strong>
                <p>{threatDescription}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ThreatDetails;
