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

  return number <= 1
    ? `${Math.round(number * 100)}%`
    : `${number}%`;
};

const formatDateTime = (value) => {
  if (!hasValue(value)) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
};

const readBackendThreat = (selectedThreat) =>
  selectedThreat?.raw?.raw || selectedThreat?.raw || {};

const getFirstValue = (values, fallback = "Not provided") => {
  const value = values.find(hasValue);
  return hasValue(value) ? value : fallback;
};

const buildThreatDescription = (selectedThreat) => {
  const backendThreat = readBackendThreat(selectedThreat);

  if (hasValue(selectedThreat?.description)) {
    return selectedThreat.description;
  }

  if (hasValue(backendThreat.description)) {
    return backendThreat.description;
  }

  const facts = [
    hasValue(backendThreat.threat_type) &&
      `Threat type is ${formatLabel(backendThreat.threat_type)}`,
    hasValue(backendThreat.severity) &&
      `severity is ${formatLabel(backendThreat.severity)}`,
    hasValue(backendThreat.event_type) &&
      `event type is ${formatLabel(backendThreat.event_type)}`,
    hasValue(backendThreat.source) &&
      `source is ${backendThreat.source}`,
    hasValue(backendThreat.confidence_score) &&
      `confidence is ${formatConfidence(backendThreat.confidence_score)}`,
  ].filter(Boolean);

  if (facts.length === 0) {
    return "No detailed threat description was provided for this record.";
  }

  return `Backend threat record summary: ${facts.join(", ")}.`;
};

const getEvidenceItems = (selectedThreat, backendThreat) => {
  const evidence = getFirstValue(
    [
      selectedThreat?.evidence,
      backendThreat.evidence,
      selectedThreat?.evidence_url,
      backendThreat.evidence_url,
      selectedThreat?.evidenceUrl,
      backendThreat.evidenceUrl,
    ],
    null
  );

  if (!evidence) {
    return [];
  }

  if (Array.isArray(evidence)) {
    return evidence;
  }

  if (typeof evidence === "object") {
    return Object.entries(evidence).map(([key, value]) => ({
      label: formatLabel(key),
      value,
    }));
  }

  return [evidence];
};

function ThreatDetails({ selectedThreat }) {
  const backendThreat = readBackendThreat(selectedThreat);

  if (!selectedThreat) {
    return (
      <div className="threat-details-page">
        <div className="threat-legend-card">
          <h3 className="threat-legend-title">HUB LEGEND</h3>

          {threatLevels.map((level) => (
            <div className="threat-legend-row" key={level.label}>
              <span className={`legend-dot ${level.className}`} />
              <span>{level.label}</span>
            </div>
          ))}
        </div>

        <main className="threat-details-main">
          <div className="threat-details-card">
            <div className="threat-details-header">
              <h1>Threat Details</h1>
              <p>
                Detailed cybersecurity threat intelligence and incident
                overview
              </p>
            </div>

            <div className="no-threat-selected-box">
              <div className="empty-state-icon">!</div>

              <h2>No Threat Selected</h2>

              <p>
                No valid threat has been selected for investigation. Return to
                the Alerts or Dashboard page and select a threat to view its
                details.
              </p>

              <div className="threat-navigation-actions">
                <button
                  type="button"
                  className="threat-navigation-button"
                  onClick={() => window.history.back()}
                >
                  ← Back
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const threatName =
    selectedThreat.name ||
    formatLabel(backendThreat.threat_type) ||
    "Selected Threat";

  const threatSeverity =
    selectedThreat.vulnerability ||
    formatLabel(backendThreat.severity) ||
    "Not provided";

  // Do not use severity as a status fallback.
  const threatStatus =
    selectedThreat.status ||
    backendThreat.status ||
    "Not provided";

  const threatSource =
    selectedThreat.source ||
    backendThreat.source ||
    "Not provided";

  const threatLocation = getFirstValue([
    selectedThreat.location,
    backendThreat.location,
    backendThreat.location_name,
    backendThreat.address,
    backendThreat.site,
    backendThreat.region,
  ]);

  const detectedAt = getFirstValue([
    selectedThreat.detectedAt,
    selectedThreat.detected_at,
    backendThreat.detected_at,
    backendThreat.detectedAt,
    backendThreat.created_at,
    backendThreat.createdAt,
    backendThreat.timestamp,
  ]);

  const eventType = hasValue(backendThreat.event_type)
    ? formatLabel(backendThreat.event_type)
    : "Not provided";

  const confidence = hasValue(backendThreat.confidence_score)
    ? formatConfidence(backendThreat.confidence_score)
    : "Not provided";

  const threatDescription = buildThreatDescription(selectedThreat);

  const recommendedResponse = getFirstValue(
    [
      selectedThreat.recommendedResponse,
      selectedThreat.recommended_response,
      backendThreat.recommended_response,
      backendThreat.recommendedResponse,
      backendThreat.response,
      backendThreat.recommendation,
    ],
    null
  );

  const evidenceItems = getEvidenceItems(selectedThreat, backendThreat);

  const getRiskColor = () => {
    switch (String(threatSeverity).toLowerCase()) {
      case "critical":
        return "#d93636";
      case "high":
        return "#e85d04";
      case "medium":
        return "#d4a017";
      case "low":
        return "#84cc16";
      default:
        return "#2b9348";
    }
  };

  return (
    <div className="threat-details-page">
      <div className="threat-legend-card">
        <h3 className="threat-legend-title">HUB LEGEND</h3>

        {threatLevels.map((level) => (
          <div className="threat-legend-row" key={level.label}>
            <span className={`legend-dot ${level.className}`} />
            <span>{level.label}</span>
          </div>
        ))}
      </div>

      <main className="threat-details-main">
        <div className="threat-details-card">
          <div className="threat-details-header">
            <div>
              <p className="threat-details-eyebrow">
                CYBERSECURITY INVESTIGATION
              </p>

              <h1>Threat Details</h1>

              <p>
                Review what happened, why it matters, and the evidence
                available for this incident.
              </p>
            </div>

            <div className="threat-navigation-actions">
              <button
                type="button"
                className="threat-navigation-button"
                onClick={() => window.history.back()}
              >
                ← Back
              </button>
            </div>
          </div>

          <section className="threat-summary-section">
            <div className="section-heading">
              <span>01</span>
              <div>
                <h2>Threat Summary</h2>
                <p>Key information about the selected incident.</p>
              </div>
            </div>

            <div className="threat-summary-card">
              <div className="threat-summary-heading">
                <div>
                  <p className="field-label">Threat</p>
                  <h3>{threatName}</h3>
                </div>

                <div
                  className="threat-risk-badge"
                  style={{ color: getRiskColor() }}
                >
                  {threatSeverity}
                </div>
              </div>

              <div className="threat-info-grid">
                <div className="threat-info-item">
                  <span>Threat Type</span>
                  <strong>
                    {formatLabel(backendThreat.threat_type) || threatName}
                  </strong>
                </div>

                <div className="threat-info-item">
                  <span>Severity</span>
                  <strong>{threatSeverity}</strong>
                </div>

                <div className="threat-info-item">
                  <span>Location</span>
                  <strong>{threatLocation}</strong>
                </div>

                <div className="threat-info-item">
                  <span>Detection Time</span>
                  <strong>{formatDateTime(detectedAt)}</strong>
                </div>

                <div className="threat-info-item">
                  <span>Status</span>
                  <strong>{formatLabel(threatStatus)}</strong>
                </div>

                <div className="threat-info-item">
                  <span>Source</span>
                  <strong className="breakable-text">{threatSource}</strong>
                </div>

                <div className="threat-info-item">
                  <span>Event Type</span>
                  <strong>{eventType}</strong>
                </div>

                <div className="threat-info-item">
                  <span>Confidence</span>
                  <strong>{confidence}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="threat-section">
            <div className="section-heading">
              <span>02</span>
              <div>
                <h2>Evidence</h2>
                <p>Evidence associated with this threat record.</p>
              </div>
            </div>

            {evidenceItems.length > 0 ? (
              <div className="evidence-list">
                {evidenceItems.map((item, index) => {
                  const isObject =
                    typeof item === "object" && item !== null;

                  const label = isObject
                    ? item.label || item.name || `Evidence ${index + 1}`
                    : `Evidence ${index + 1}`;

                  const value = isObject
                    ? item.value || item.url || item.path || ""
                    : item;

                  return (
                    <div className="evidence-item" key={`${label}-${index}`}>
                      <span>{label}</span>
                      <p className="breakable-text">{String(value)}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-content-box">
                No evidence was provided for this threat record.
              </div>
            )}
          </section>

          <section className="threat-section">
            <div className="section-heading">
              <span>03</span>
              <div>
                <h2>Detailed Description</h2>
                <p>Context and information available about the incident.</p>
              </div>
            </div>

            <div className="threat-description-section">
              <p>{threatDescription}</p>
            </div>
          </section>

          {recommendedResponse && (
            <section className="threat-section">
              <div className="section-heading">
                <span>04</span>
                <div>
                  <h2>Recommended Response</h2>
                  <p>Response guidance supplied with this threat record.</p>
                </div>
              </div>

              <div className="recommended-response-box">
                <p>{String(recommendedResponse)}</p>
              </div>
            </section>
          )}

          <div className="threat-details-footer">
            <p>
              Review the available evidence and threat context before taking
              further action.
            </p>

            <button
              type="button"
              className="threat-navigation-button"
              onClick={() => window.history.back()}
            >
              ← Return to previous page
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ThreatDetails;