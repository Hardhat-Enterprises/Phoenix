import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getThreatById } from "./services/phoenixApi";
import { getApiErrorState } from "./utils/apiErrorUtils";
import { safeTrim } from "./utils/textUtils";
import {
  AuthenticationState,
  EmptyState,
  ErrorState,
  LoadingState,
} from "./components/States";
import { HOME_PATH } from "./config/routes";
import "./ThreatDetails.css";
import "./components/design.css";

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
  safeTrim(value)
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatConfidence = (value) => {
  const number = typeof value === "number" || typeof value === "string"
    ? Number(value)
    : NaN;

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
  selectedThreat?.raw?.raw ||
  selectedThreat?.raw ||
  selectedThreat ||
  {};

function ThreatDetails({ selectedThreat: threatFromState, onBack }) {
  const { threatId } = useParams();
  const navigate = useNavigate();
  const [requestState, setRequestState] = useState({
    threatId: null,
    status: "loading",
    threat: null,
  });
  const [requestAttempt, setRequestAttempt] = useState(0);
  const routeRequest = requestState.threatId === threatId ? requestState : null;
  const status = threatId ? routeRequest?.status || "loading" : "ready";

  // Parameterized routes always load the exact backend record; the base route
  // retains its existing Dashboard selection behavior.
  useEffect(() => {
    if (!threatId) return undefined;

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

    getThreatById(threatId, { signal: controller.signal })
      .then((threat) => {
        if (controller.signal.aborted) return;

        setRequestState({
          threatId,
          status: threat ? "ready" : "empty",
          threat,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        setRequestState({
          threatId,
          status: getApiErrorState(error),
          threat: null,
        });
      });

    return () => controller.abort();
  }, [threatId, requestAttempt]);

  const selectedThreat = threatId ? routeRequest?.threat : threatFromState;
  const retryThreat = () => {
    setRequestState({ threatId, status: "loading", threat: null });
    setRequestAttempt((attempt) => attempt + 1);
  };

  const handleBack = () => {
    if (onBack) return onBack();
    if (window.history.length > 1) return navigate(-1);
    return navigate(HOME_PATH);
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
    safeTrim(selectedThreat?.name) ||
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
    ? formatLabel(backendThreat.event_type) || "Not provided"
    : "Not provided";

  const confidence = hasValue(backendThreat.confidence_score)
    ? formatConfidence(backendThreat.confidence_score) || "Not provided"
    : "Not provided";
  const backendDetails = threatId ? backendThreat.details : null;
  let threatDescription = "Not provided";

  if (typeof backendDetails === "string" && hasValue(backendDetails)) {
    threatDescription = backendDetails;
  } else if (
    typeof backendDetails?.description === "string" &&
    hasValue(backendDetails.description)
  ) {
    threatDescription = backendDetails.description;
  } else if (
    !threatId &&
    typeof selectedThreat?.description === "string" &&
    hasValue(selectedThreat.description)
  ) {
    threatDescription = selectedThreat.description;
  }

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

  // Chooses which panel to show inside the existing card layout.
  const renderBody = () => {
    if (status === "loading") {
      return (
        <LoadingState
          title="Loading threat…"
          description="Fetching this threat record from the Phoenix API."
        />
      );
    }

    if (status === "auth") {
      return (
        <AuthenticationState
          title="Sign in required"
          description="Please sign in before loading threat details."
          onAction={() => navigate("/login")}
        />
      );
    }

    if (status === "notfound") {
      return (
        <EmptyState
          title="Threat not found"
          description="This threat may have been removed, or the link may be incorrect."
        />
      );
    }

    if (status === "empty") {
      return (
        <EmptyState
          title="Threat data unavailable"
          description="The Phoenix API did not return a usable matching threat record."
          actionLabel="Retry"
          onAction={retryThreat}
        />
      );
    }

    if (status === "forbidden") {
      return (
        <ErrorState
          title="Access denied"
          description="Your account cannot access this threat."
        />
      );
    }

    if (status === "error") {
      return (
        <ErrorState
          title="Could not load this threat"
          description="Threat details could not be loaded. Please try again."
          onRetry={retryThreat}
        />
      );
    }

    if (!selectedThreat) {
      return (
        <div className="no-threat-selected-box">
          <h2>No Threat Selected</h2> <br />
          <p>Please select a threat from the dashboard item list.</p>
        </div>
      );
    }

    return (
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
    );
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