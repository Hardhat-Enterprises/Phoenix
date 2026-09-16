import { useId } from "react";
import { adaptCorrelationResult } from "../services/correlationResultAdapter";
import "./CorrelationResult.css";

const STATE_CONTENT = {
  related: {
    title: "Hazard relationship identified",
    className: "correlation-result--related",
  },

  unrelated: {
    title: "No hazard relationship identified",
    className: "correlation-result--unrelated",
  },

  inconclusive: {
    title: "Correlation result inconclusive",
    className: "correlation-result--inconclusive",
  },

  invalid: {
    title: "Input needs correction",
    className: "correlation-result--invalid",
  },

  processing: {
    title: "Correlation analysis in progress",
    className: "correlation-result--processing",
  },

  unavailable: {
    title: "Correlation result unavailable",
    className: "correlation-result--unavailable",
  },
};

const readableRelationship = (value) => {
  if (!value || value === "unknown") {
    return "Not specified";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatScore = (score) => {
  if (!Number.isFinite(score)) {
    return "Not available";
  }

  return score.toFixed(2);
};

export default function CorrelationResult({
  result,
  source = "demonstration",
}) {
  const titleId = useId();
  const detailId = useId();

  const correlation = adaptCorrelationResult(result, {
    source,
  });

  const state =
    STATE_CONTENT[correlation.presentationState] ||
    STATE_CONTENT.unavailable;

  const additionalMatches = Math.max(
    0,
    (correlation.matchCount || 0) - 1,
  );

  const hazardType = correlation.hazard?.type || null;

  const hazardLocation =
    correlation.hazard?.location?.displayName || null;

  const statusDetail =
    correlation.statusDetail ||
    "Correlation information is available for review.";

  return (
    <section
      className={`correlation-result ${state.className}`}
      aria-labelledby={titleId}
      aria-describedby={detailId}
    >
      <div className="correlation-result__header">
        <div>
          <p className="correlation-result__eyebrow">
            Correlation result
          </p>

          <h2 id={titleId}>{state.title}</h2>
        </div>

        <span
          className="correlation-result__source"
          aria-label={
            correlation.source === "live"
              ? "Live correlation result"
              : "Demonstration correlation result"
          }
        >
          {correlation.source === "live"
            ? "Live result"
            : "Demonstration result"}
        </span>
      </div>

      <p
        id={detailId}
        className="correlation-result__detail"
      >
        {statusDetail}
      </p>

      {correlation.presentationState === "unrelated" && (
        <p className="correlation-result__notice">
          No active hazard relationship was identified by this
          correlation result. This does not mean the content is safe.
        </p>
      )}

      {correlation.presentationState === "related" && (
        <p className="correlation-result__notice">
          A hazard relationship was identified. This does not indicate
          that the content is malicious.
        </p>
      )}

      {correlation.presentationState === "inconclusive" && (
        <p className="correlation-result__notice">
          A relationship decision cannot be made because active hazard
          information was not available.
        </p>
      )}

      <dl className="correlation-result__grid">
        <div>
          <dt>Relationship</dt>
          <dd>
            {readableRelationship(
              correlation.relationshipType,
            )}
          </dd>
        </div>

        <div>
          <dt>Correlation score</dt>
          <dd>{formatScore(correlation.correlationScore)}</dd>
        </div>

        <div>
          <dt>Status</dt>
          <dd>{readableRelationship(correlation.status)}</dd>
        </div>

        <div>
          <dt>Model version</dt>
          <dd>
            {correlation.modelVersion || "Not available"}
          </dd>
        </div>

        {hazardType && (
          <div>
            <dt>Matched hazard type</dt>
            <dd>{hazardType}</dd>
          </div>
        )}

        {hazardLocation && (
          <div>
            <dt>Matched hazard location</dt>
            <dd>{hazardLocation}</dd>
          </div>
        )}

        {correlation.matchCount > 0 && (
          <div>
            <dt>Hazard matches</dt>
            <dd>
              {correlation.matchCount}

              {additionalMatches > 0 &&
                ` - primary hazard shown, ${additionalMatches} additional`}
            </dd>
          </div>
        )}
      </dl>

      {correlation.presentationState === "invalid" && (
        <div
          className="correlation-result__action"
          role="alert"
        >
          Check that the submitted content contains usable text or a
          URL, then try again.
        </div>
      )}

      {correlation.presentationState === "processing" && (
        <div
          className="correlation-result__status"
          role="status"
          aria-live="polite"
        >
          The correlation result is still being prepared.
        </div>
      )}

      {correlation.presentationState === "unavailable" && (
        <div
          className="correlation-result__status"
          role="status"
          aria-live="polite"
        >
          Correlation information cannot currently be displayed.
        </div>
      )}
    </section>
  );
}