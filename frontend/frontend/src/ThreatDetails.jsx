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

  return number <= 1 ? `${Math.round(number * 100)}%` : `${number}%`;
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

    const controller = new AbortController();

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

  const backendThreat = readBackendThreat(selectedThreat);
  const threatName =
    safeTrim(selectedThreat?.name) ||
    formatLabel(backendThreat.threat_type) ||
    "Selected Threat";
  const threatSeverity =
    safeTrim(selectedThreat?.vulnerability) ||
    formatLabel(backendThreat.severity) ||
    "Not provided";
  const threatStatus = safeTrim(selectedThreat?.status) || "Not provided";
  const threatSource =
    safeTrim(backendThreat.source) || safeTrim(selectedThreat?.source) || "Not provided";
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
