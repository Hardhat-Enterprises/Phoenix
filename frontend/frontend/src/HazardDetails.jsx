import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getHazardById } from "./services/phoenixApi";
import "./ThreatDetails.css";
import "./components/design.css";

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const formatLabel = (value) =>
  String(value || "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

// Severity may arrive as a fraction or a percentage. Mirrors the
// formatting used by the Alerts list so the two agree.
const formatSeverity = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return number <= 1 ? `${Math.round(number * 100)}%` : `${number}%`;
};

const formatDate = (value) => {
  if (!hasValue(value)) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

// Every field falls back to "Not provided" rather than rendering blank,
// so a partial backend record still produces a readable page.
const fallback = (value) => (hasValue(value) ? value : "Not provided");

function HazardDetails() {
  const { hazardId } = useParams();
  const navigate = useNavigate();

  const [hazard, setHazard] = useState(null);
  // Holds the outcome of the last completed fetch and which id it was for.
  const [result, setResult] = useState({ id: null, status: null });

  // Both the missing-id case and the in-flight case are knowable without
  // writing state from inside the effect, so derive them here instead.
  const hasId = hasValue(hazardId);
  const status = !hasId
    ? "invalid"
    : result.id === hazardId
      ? result.status
      : "loading";

  useEffect(() => {
    if (!hasId) return undefined;

    let cancelled = false;

    getHazardById(hazardId)
      .then((record) => {
        if (cancelled) return;

        // An empty object means the endpoint answered but held no record.
        const isEmpty =
          !record ||
          (typeof record === "object" && Object.keys(record).length === 0);

        setHazard(isEmpty ? null : record);
        setResult({ id: hazardId, status: isEmpty ? "notfound" : "ready" });
      })
      .catch((error) => {
        if (cancelled) return;
        setResult({
          id: hazardId,
          status: error?.status === 404 ? "notfound" : "error",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [hazardId, hasId]);

  const handleBack = () => {
    if (window.history.length > 1) return navigate(-1);
    return navigate("/alerts");
  };

  const hazardType = formatLabel(hazard?.hazard_type);
  const title = hasValue(hazardType) ? hazardType : "Hazard";

  const fields = [
    { label: "Hazard type", value: fallback(hazardType) },
    { label: "Location", value: fallback(hazard?.hazard_location) },
    { label: "Alert level", value: fallback(formatLabel(hazard?.alert_level)) },
    { label: "Status", value: fallback(formatLabel(hazard?.hazard_status)) },
    {
      label: "Severity",
      value: fallback(formatSeverity(hazard?.hazard_severity)),
    },
    { label: "Source", value: fallback(formatLabel(hazard?.source)) },
    {
      label: "Reported",
      value: fallback(
        formatDate(
          hazard?.created_at || hazard?.reported_at || hazard?.detected_at,
        ),
      ),
    },
    { label: "Last updated", value: fallback(formatDate(hazard?.updated_at)) },
  ];

  const renderBody = () => {
    if (status === "loading") {
      return (
        <div className="no-threat-selected-box" aria-live="polite">
          <h2>Loading hazard…</h2> <br />
          <p>Fetching this hazard record from the Phoenix API.</p>
        </div>
      );
    }

    if (status === "invalid") {
      return (
        <div className="no-threat-selected-box" role="alert">
          <h2>No hazard id supplied</h2> <br />
          <p>The address is missing a hazard identifier.</p>
        </div>
      );
    }

    if (status === "notfound") {
      return (
        <div className="no-threat-selected-box" role="alert">
          <h2>Hazard not found</h2> <br />
          <p>
            No hazard matches the id <strong>{hazardId}</strong>. It may have
            been removed, or the link may be incorrect.
          </p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="no-threat-selected-box" role="alert">
          <h2>Could not load this hazard</h2> <br />
          <p>
            The Phoenix API did not respond. Check your connection or sign in,
            then try again.
          </p>
        </div>
      );
    }

    return (
      <div className="selected-threat-box">
        <h2>{title}</h2>

        <div className="threat-info-grid">
          {fields.map((field) => (
            <div key={field.label}>
              <strong>{field.label}</strong>
              <p>{field.value}</p>
            </div>
          ))}
        </div>

        <div className="threat-description-section">
          <strong>Description</strong>
          <p>{fallback(hazard?.text || hazard?.description)}</p>
        </div>

        {hasValue(hazard?.url) && (
          <div className="threat-description-section">
            <strong>Source link</strong>
            <p>
              <a href={hazard.url} rel="noreferrer" target="_blank">
                {hazard.url}
              </a>
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="threat-details-page">
      <main className="threat-details-main">
        <div className="threat-details-card">
          <div className="threat-details-header">
            <h1>Hazard Details</h1> <br />
            <p>Backend hazard record with location, severity and status.</p>
          </div>

          {renderBody()}

          <div className="threat-back-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleBack}
            >
              &larr; Back to Alerts
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default HazardDetails;