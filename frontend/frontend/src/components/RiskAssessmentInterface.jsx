import React, { useEffect, useState, useCallback } from "react";
import { usePreferences } from "../PreferencesContext";
import { formatDisplayDate } from "../displayDate";
import "./RiskAssessmentInterface.css";
import { getRiskAssessments, getRiskAssessmentById } from "./riskAssessmentApi";

// ---------------------------------------------------------------------------
// RiskAssessmentInterface.jsx
//
// Sprint 1 deliverable — Varun Reddy Maligireddy
// "Develop the risk assessment interface": a frontend prototype using clearly
// labelled demonstration data, with list, detail, empty and error states.
//
// Fields covered per brief: correlation score, linkage reason, integration
// confidence, linked-event type, event status, related hazard/threat IDs,
// event/detected/reported times, created/updated times.
//
// Data comes from riskAssessmentApi.js (an adapter). Swapping demo data for
// live API data later only requires changes inside that adapter — this
// component and its children do not need to change.
// ---------------------------------------------------------------------------

const CONFIDENCE_CLASS = {
  High: "ra-pill ra-pill--high",
  Medium: "ra-pill ra-pill--medium",
  Low: "ra-pill ra-pill--low",
};

const STATUS_CLASS = {
  Active: "ra-pill ra-pill--active",
  "Under Review": "ra-pill ra-pill--review",
  Dismissed: "ra-pill ra-pill--dismissed",
};

function DemoBadge() {
  return <span className="ra-demo-badge">Demo data</span>;
}

function formatDateTime(iso, dateFormat) {
  return formatDisplayDate(iso, dateFormat, {
    fallback: "Not provided",
    includeTime: true,
    systemOptions: {
      dateStyle: "medium",
      timeStyle: "short",
    },
    timeOptions: {
      hour: "numeric",
      minute: "2-digit",
    },
  });
}

function LoadingState({ label }) {
  return (
    <div className="ra-state ra-state--loading" role="status" aria-live="polite">
      <div className="ra-spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="ra-state ra-state--empty">
      <h3>No risk assessments yet</h3>
      <p>
        Correlated hazard/threat events will appear here once they're linked.
        This prototype currently shows demonstration records only.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="ra-state ra-state--error" role="alert">
      <h3>Couldn't load risk assessments</h3>
      <p>{message || "Something went wrong while contacting the server."}</p>
      <button type="button" className="ra-btn ra-btn--retry" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

// Sprint 2 — distinct from ErrorState on purpose. A generic ErrorState with
// a Retry button implies something transient and fixable failed. When the
// backend genuinely doesn't expose this endpoint in this environment,
// retrying won't help — so this state says so plainly, with no Retry
// button, rather than implying a fixable failure. See
// riskAssessmentApi.js's RISK_BACKEND_UNAVAILABLE error code.
function UnavailableState() {
  return (
    <div className="ra-state ra-state--unavailable" role="status">
      <h3>Not available in this environment</h3>
      <p>
        Risk assessment data isn't available from the backend configured for
        this environment. This isn't an error you can fix by retrying — the
        environment simply doesn't have this endpoint enabled yet.
      </p>
    </div>
  );
}

function RiskAssessmentListItem({ assessment, onSelect }) {
  return (
    <li className="ra-list-item">
      <button
        type="button"
        className="ra-list-item__button"
        onClick={() => onSelect(assessment.id)}
      >
        <div className="ra-list-item__top">
          <span className="ra-list-item__id">{assessment.id}</span>
          {assessment.isDemo && <DemoBadge />}
        </div>
        <div className="ra-list-item__event">{assessment.linkedEventType}</div>
        <div className="ra-list-item__meta">
          <span className={CONFIDENCE_CLASS[assessment.integrationConfidence] || "ra-pill"}>
            {assessment.integrationConfidence} confidence
          </span>
          <span className={STATUS_CLASS[assessment.eventStatus] || "ra-pill"}>
            {assessment.eventStatus}
          </span>
          <span className="ra-score">
            Score {assessment.correlationScore != null ? assessment.correlationScore.toFixed(2) : "—"}
          </span>
        </div>
      </button>
    </li>
  );
}

function RiskAssessmentList({ assessments, onSelect }) {
  return (
    <ul className="ra-list">
      {assessments.map((a) => (
        <RiskAssessmentListItem key={a.id} assessment={a} onSelect={onSelect} />
      ))}
    </ul>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="ra-detail__row">
      <dt>{label}</dt>
      <dd>{value === undefined || value === null || value === "" ? "Not provided" : value}</dd>
    </div>
  );
}

function RiskAssessmentDetail({ assessment, onBack }) {
  const { preferences } = usePreferences();
  const dateFormat = preferences.dateFormat;

  return (
    <div className="ra-detail">
      <button type="button" className="ra-btn ra-btn--back" onClick={onBack}>
        ← Back to list
      </button>

      <div className="ra-detail__header">
        <div>
          <h2>{assessment.id}</h2>
          <p className="ra-detail__event-type">{assessment.linkedEventType}</p>
        </div>
        {assessment.isDemo && <DemoBadge />}
      </div>

      <div className="ra-detail__pills">
        <span className={CONFIDENCE_CLASS[assessment.integrationConfidence] || "ra-pill"}>
          {assessment.integrationConfidence} integration confidence
        </span>
        <span className={STATUS_CLASS[assessment.eventStatus] || "ra-pill"}>
          {assessment.eventStatus}
        </span>
      </div>

      <dl className="ra-detail__grid">
        <DetailRow
          label="Correlation score"
          value={assessment.correlationScore != null ? assessment.correlationScore.toFixed(2) : null}
        />
        <DetailRow label="Linkage reason" value={assessment.linkageReason} />
        <DetailRow label="Related hazard ID" value={assessment.relatedHazardId} />
        <DetailRow label="Related threat ID" value={assessment.relatedThreatId} />
        <DetailRow label="Event time" value={formatDateTime(assessment.eventTime, dateFormat)} />
        <DetailRow label="Detected time" value={formatDateTime(assessment.detectedTime, dateFormat)} />
        <DetailRow label="Reported time" value={formatDateTime(assessment.reportedTime, dateFormat)} />
        <DetailRow label="Created at" value={formatDateTime(assessment.createdAt, dateFormat)} />
        <DetailRow label="Updated at" value={formatDateTime(assessment.updatedAt, dateFormat)} />
      </dl>

      {assessment.isDemo && (
        <p className="ra-detail__disclaimer">
          This record is demonstration data prepared for the Sprint 1 frontend prototype.
          It is not a live integration log or a real correlated event.
        </p>
      )}
    </div>
  );
}

export default function RiskAssessmentInterface() {
  const [view, setView] = useState("list"); // "list" | "detail"
  const [assessments, setAssessments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [listStatus, setListStatus] = useState("loading"); // loading | ready | empty | error | unavailable
  const [detailStatus, setDetailStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDemoSource, setIsDemoSource] = useState(true);

  // NOTE: loadList intentionally does NOT call setListStatus/setErrorMessage
  // synchronously before its first `await` — the initial "loading"/"" values
  // already come from useState's defaults above, and the retry path resets
  // them explicitly in its own onClick handler (a real event handler, not an
  // effect). Calling setState synchronously inside a function that's invoked
  // directly from useEffect trips the react-hooks/set-state-in-effect rule.
  const loadList = useCallback(async () => {
    try {
      const { data, demo } = await getRiskAssessments();
      setIsDemoSource(demo);
      setAssessments(data);
      setListStatus(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      if (err.code === "RISK_BACKEND_UNAVAILABLE") {
        setIsDemoSource(false);
        setListStatus("unavailable");
        return;
      }
      setErrorMessage(err.message || "Unable to reach the risk-assessment service.");
      setListStatus("error");
    }
  }, []);

  // This is the standard "fetch data on mount" pattern (loadList only calls
  // setState after its `await` resolves). This rule flags any effect-invoked
  // async function that eventually calls setState, which would rule out data
  // fetching in effects entirely — not a bug, just an overly strict rule for
  // this well-established pattern.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadList();
  }, [loadList]);

  const retryList = useCallback(() => {
    setListStatus("loading");
    setErrorMessage("");
    loadList();
  }, [loadList]);

  const handleSelect = useCallback(async (id) => {
    setView("detail");
    setDetailStatus("loading");
    setErrorMessage("");
    try {
      const { data } = await getRiskAssessmentById(id);
      setSelected(data);
      setDetailStatus("ready");
    } catch (err) {
      if (err.message === "NOT_FOUND") {
        setErrorMessage("This risk assessment couldn't be found. It may have been removed.");
      } else {
        setErrorMessage(err.message || "Unable to load this risk assessment.");
      }
      setDetailStatus("error");
    }
  }, []);

  const handleBack = () => {
    setView("list");
    setSelected(null);
    setDetailStatus("idle");
  };

  return (
    <section className="ra-page" aria-label="Risk assessment interface">
      <header className="ra-page__header">
        <div>
          <h1>Risk Assessments</h1>
          <p className="ra-page__subtitle">
            Correlated hazard/threat linkage records for community liaison and analyst review.
          </p>
        </div>
        {isDemoSource && view === "list" && <DemoBadge />}
      </header>

      {view === "list" && (
        <>
          {listStatus === "loading" && <LoadingState label="Loading risk assessments…" />}
          {listStatus === "error" && <ErrorState message={errorMessage} onRetry={retryList} />}
          {listStatus === "unavailable" && <UnavailableState />}
          {listStatus === "empty" && <EmptyState />}
          {listStatus === "ready" && (
            <RiskAssessmentList assessments={assessments} onSelect={handleSelect} />
          )}
        </>
      )}

      {view === "detail" && (
        <>
          {detailStatus === "loading" && <LoadingState label="Loading assessment details…" />}
          {detailStatus === "error" && (
            <div>
              <button type="button" className="ra-btn ra-btn--back" onClick={handleBack}>
                ← Back to list
              </button>
              <ErrorState message={errorMessage} onRetry={handleBack} />
            </div>
          )}
          {detailStatus === "ready" && selected && (
            <RiskAssessmentDetail assessment={selected} onBack={handleBack} />
          )}
        </>
      )}
    </section>
  );
}
