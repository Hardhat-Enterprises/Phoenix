import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getThreats } from "./services/phoenixApi";
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

// Matches a threat record against an id from the URL. Mirrors the id
// fallback chain used by normalizeThreatRow in Dashboard.jsx.
const idOf = (threat) =>
  String(
    threat?.id ??
      threat?.threat_id ??
      threat?.raw?.threat_id ??
      threat?.raw?.id ??
      threat?.event_id ??
      threat?.uuid ??
      "",
  );

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

function ThreatDetails({ selectedThreat: threatFromState, onBack }) {
  const { threatId } = useParams();
  const navigate = useNavigate();

  // Use the threat already in memory when it matches the URL. That covers
  // the normal click-through and avoids a network call.
  const stateMatches =
    threatFromState && (!threatId || idOf(threatFromState) === threatId);

  const [fetched, setFetched] = useState(null);
  const [fetchStatus, setFetchStatus] = useState("loading");

  // A threat already in memory needs no fetch, so the fetch status does not
  // apply. Deriving this rather than writing it into state inside the effect
  // avoids an extra render pass.
  const needsFetch = Boolean(threatId) && !stateMatches;
  const status = needsFetch ? fetchStatus : "ready";

  // After a refresh or on a shared link the in-memory threat is gone, so
  // reload the list and find the id. There is no get-by-id endpoint.
  useEffect(() => {
    if (!needsFetch) return undefined;

    let cancelled = false;

    getThreats({ limit: 100 })
      .then(({ items }) => {
        if (cancelled) return;
        const match = items.find((item) => idOf(item) === threatId);
        setFetched(match || null);
        setFetchStatus(match ? "ready" : "notfound");
      })
      .catch(() => {
        if (!cancelled) setFetchStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [threatId, needsFetch]);

  const selectedThreat = stateMatches ? threatFromState : fetched;

  const handleBack = () => {
    if (onBack) return onBack();
    if (window.history.length > 1) return navigate(-1);
    return navigate(HOME_PATH);
  };

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
    selectedThreat?.source || backendThreat.source || "Not provided";
  const eventType = hasValue(backendThreat.event_type)
    ? formatLabel(backendThreat.event_type)
    : "Not provided";
  const confidence = hasValue(backendThreat.confidence_score)
    ? formatConfidence(backendThreat.confidence_score)
    : "Not provided";
  const threatDescription = buildThreatDescription(selectedThreat);

  const getRiskColor = () => {
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

  // Chooses which panel to show inside the card: loading, error,
  // not-found, the threat itself, or the original empty state.
  const renderBody = () => {
    if (status === "loading") {
      return (
        <div className="no-threat-selected-box" aria-live="polite">
          <h2>Loading threat…</h2> <br />
          <p>Fetching this threat record from the Phoenix API.</p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="no-threat-selected-box" role="alert">
          <h2>Could not load this threat</h2> <br />
          <p>
            The Phoenix API did not respond. Check your connection or sign in,
            then try again.
          </p>
        </div>
      );
    }

    if (status === "notfound") {
      return (
        <div className="no-threat-selected-box" role="alert">
          <h2>Threat not found</h2> <br />
          <p>
            No threat matches the id <strong>{threatId}</strong>. It may have
            been removed, or the link may be incorrect.
          </p>
        </div>
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
            <span className={`legend-dot ${level.className}`}></span>
            <span>{level.label}</span>
          </div>
        ))}
      </div>

      <main className="threat-details-main">
        <div className="threat-details-card">
          <div className="threat-details-header">
            <h1>Threat Details</h1> <br />
            <p>
              Detailed cybersecurity threat intelligence and incident overview
            </p>
          </div>

          {renderBody()}

          <div className="threat-back-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleBack}
            >
              &larr; Back
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ThreatDetails;