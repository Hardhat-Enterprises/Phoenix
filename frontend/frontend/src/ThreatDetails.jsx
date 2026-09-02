import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getThreat } from "./services/phoenixApi";
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

const needsSignIn = (error) =>
  error?.status === 401 ||
  String(error?.message || "").toLowerCase().includes("sign in");

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

    const controller = new AbortController();

    getThreat(threatId, { signal: controller.signal })
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

        let nextStatus = "error";

        if (needsSignIn(error)) {
          nextStatus = "auth";
        } else if (error?.status === 404) {
          nextStatus = "notfound";
        }

        setRequestState({
          threatId,
          status: nextStatus,
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

  const backendThreat = readBackendThreat(selectedThreat);
  const threatName =
    selectedThreat?.name ||
    formatLabel(backendThreat.threat_type) ||
    "Selected Threat";
  const threatSeverity =
    selectedThreat?.vulnerability ||
    formatLabel(backendThreat.severity) ||
    "Not provided";
  const threatStatus = selectedThreat?.status || "Not provided";
  const threatSource =
    backendThreat.source || selectedThreat?.source || "Not provided";
  const eventType = hasValue(backendThreat.event_type)
    ? formatLabel(backendThreat.event_type)
    : "Not provided";
  const confidence = hasValue(backendThreat.confidence_score)
    ? formatConfidence(backendThreat.confidence_score)
    : "Not provided";
  const threatDescription = selectedThreat?.description || "Not provided";

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

  // Chooses which panel to show inside the existing card layout.
  const renderBody = () => {
    if (status === "loading") {
      return (
        <div className="no-threat-selected-box" aria-live="polite">
          <h2>Loading threat…</h2> <br />
          <p>Fetching this threat record from the Phoenix API.</p>
        </div>
      );
    }

    if (status === "auth") {
      return (
        <div className="no-threat-selected-box" role="alert">
          <h2>Sign in required</h2> <br />
          <p>Please sign in before loading threat details.</p>
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

    if (status === "empty") {
      return (
        <div className="no-threat-selected-box" role="alert">
          <h2>Threat data unavailable</h2> <br />
          <p>The Phoenix API returned no threat record for this request.</p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="no-threat-selected-box" role="alert">
          <h2>Could not load this threat</h2> <br />
          <p>Threat details could not be loaded. Please try again.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={retryThreat}
          >
            Retry
          </button>
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