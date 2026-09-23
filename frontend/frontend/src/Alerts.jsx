import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { threatPath } from "./config/routes";
import AlertSidebar from "./components/AlertSidebar";
import { getHazards } from "./services/phoenixApi";
import { hazardPath } from "./config/routes";
import "./Alerts.css";

//converts backend values into readable labels
const formatLabel = (value) =>
  String(value || "Unknown")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

//Safely checks whether a value is present
const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const needsSignIn = (error) =>
  String(error?.message || "")
    .toLowerCase()
    .includes("sign in");

//Removes duplicate filter options
const uniqueBy = (items, keySelector) => {
  const seen = new Set();

  return items.filter((item) => {
    const key = keySelector(item);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

//Normalises values for comparison and grouping
const normalizeGroupText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/unkown/g, "unknown")
    .replace(/\s+/g, " ");

//Prevents empty or unknown locations appearing in title
const cleanLocation = (value) => {
  const normalized = normalizeGroupText(value);

  if (!normalized || normalized === "unknown") {
    return "";
  }

  return String(value).trim();
};

const formatSource = (value) => (hasValue(value) ? formatLabel(value) : "");

//Formats numeric severity values as percentages
const formatHazardSeverity = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "";
  }

  return number <= 1 ? `${Math.round(number * 100)}%` : `${number}%`;
};

//Reads the timestamp field used by the Phoenix hazard response
const getHazardTimestamp = (hazard) =>
  hazard.created_at ||
  hazard.updated_at ||
  hazard.timestamp ||
  hazard.published_at ||
  hazard.detected_at ||
  hazard.alert_time ||
  "";

//Converts a timestamp into a readable local date/time
const formatTimestamp = (value) => {
  if (!hasValue(value)) {
    return "Time unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

//Converts priority/severity values into CSS severity categories.
const statusClassFor = (status) => {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("critical") || normalized.includes("emergency")) {
    return "critical";
  }

  if (normalized.includes("high")) {
    return "high";
  }

  if (
    normalized.includes("medium") ||
    normalized.includes("warning") ||
    normalized.includes("watch")
  ) {
    return "medium";
  }

  return "low";
};

//Provides a readable severity label
const severityLabelFor = (alertLevel, status, severity) => {
  const source = `${alertLevel} ${status}`.toLowerCase();

  if (source.includes("emergency")) {
    return "Emergency";
  }

  if (source.includes("high")) {
    return "High";
  }

  if (
    source.includes("medium") ||
    source.includes("warning") ||
    source.includes("watch")
  ) {
    return "Medium";
  }

  if (hasValue(severity)) {
    return severity;
  }

  return "Low";
};

//Maps one Phoenix hazard record into the view model used by Alerts
const mapHazardToAlert = (hazard, index) => {
  const hazardType = hasValue(hazard.hazard_type)
    ? formatLabel(hazard.hazard_type)
    : `Hazard ${index + 1}`;

  const location = cleanLocation(hazard.hazard_location);

  const alertLevel = hasValue(hazard.alert_level)
    ? formatLabel(hazard.alert_level)
    : "";

  const status = hasValue(hazard.hazard_status)
    ? formatLabel(hazard.hazard_status)
    : "";

  const severity = formatHazardSeverity(hazard.hazard_severity);
  const source = formatSource(hazard.source);
  const timestamp = getHazardTimestamp(hazard);
  const severityLabel = severityLabelFor(alertLevel, status, severity);

  const evidenceText = hazard.text || "";
  const evidenceUrl = hazard.url || "";

  const title = location ? `${hazardType} - ${location}` : hazardType;

  const fields = [
    {
      label: "Hazard type",
      value: hazardType,
    },
    {
      label: "Hazard location",
      value: location,
    },
    {
      label: "Alert priority",
      value: alertLevel,
    },
    {
      label: "Current status",
      value: status,
    },
    {
      label: "Hazard severity",
      value: severity,
    },
    {
      label: "Backend source",
      value: source,
    },
  ].filter((field) => hasValue(field.value));

  // Only a real backend identifier can open the detail endpoint. The
  // positional fallback below is for React keys, not for navigation.
  const backendId =
    hazard.hazard_event_id || hazard.hazard_id || hazard.id || "";

  return {
    id: backendId || `hazard-alert-${index}`,
    backendId,
    title,
    description: evidenceText,
    evidenceText,
    evidenceUrl,
    hazardType,
    rawHazardType: String(hazard.hazard_type || "").toLowerCase(),
    alertLevel,
    rawAlertLevel: String(hazard.alert_level || "").toLowerCase(),
    status,
    rawStatus: String(hazard.hazard_status || "").toLowerCase(),
    severity,
    severityLabel,
    timestamp,
    formattedTimestamp: formatTimestamp(timestamp),
    fields,
    raw: hazard,
  };
};

//Groups repeated records using the main alert-identifying fields
const groupHazards = (hazards) => {
  const groups = new Map();

  hazards.forEach((hazard) => {
    const key = [
      normalizeGroupText(hazard.hazardType),
      normalizeGroupText(hazard.raw.hazard_location),
      normalizeGroupText(hazard.alertLevel),
      normalizeGroupText(hazard.status),
      normalizeGroupText(hazard.severity),
      normalizeGroupText(hazard.raw.source),
    ].join("|");

    const existing = groups.get(key);

    if (existing) {
      existing.count += 1;

      if (
        hasValue(hazard.timestamp) &&
        (!hasValue(existing.latestTimestamp) ||
          new Date(hazard.timestamp) > new Date(existing.latestTimestamp))
      ) {
        existing.latestTimestamp = hazard.timestamp;
        existing.latestFormattedTimestamp = hazard.formattedTimestamp;
      }

      if (
        hasValue(hazard.evidenceText) &&
        !existing.evidenceTexts.some(
          (text) =>
            normalizeGroupText(text) ===
            normalizeGroupText(hazard.evidenceText),
        )
      ) {
        existing.evidenceTexts.push(hazard.evidenceText);
      }

      if (
        hasValue(hazard.evidenceUrl) &&
        !existing.evidenceUrls.some(
          (url) =>
            normalizeGroupText(url) === normalizeGroupText(hazard.evidenceUrl),
        )
      ) {
        existing.evidenceUrls.push(hazard.evidenceUrl);
      }

      return;
    }

    groups.set(key, {
      ...hazard,
      id: key,
      // The grouped row's id becomes a composite key, so hold on to the first
      // underlying record's backend id for opening its detail page.
      firstHazardId: hazard.backendId,
      count: 1,
      latestTimestamp: hazard.timestamp,
      latestFormattedTimestamp: hazard.formattedTimestamp,
      evidenceTexts: hasValue(hazard.evidenceText) ? [hazard.evidenceText] : [],
      evidenceUrls: hasValue(hazard.evidenceUrl) ? [hazard.evidenceUrl] : [],
    });
  });

  return [...groups.values()];
};

//Builds the priority chart from filtered records
const buildHazardChartRows = (hazards) => {
  const counts = hazards.reduce((accumulator, hazard) => {
    const label = hazard.alertLevel || hazard.status || "Unknown";
    accumulator[label] = (accumulator[label] || 0) + 1;
    return accumulator;
  }, {});
  const maxCount = Math.max(...Object.values(counts), 0);

  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
      className: statusClassFor(label),
      width:
        maxCount > 0 ? Math.max(12, Math.round((count / maxCount) * 100)) : 0,
    }))
    .sort((first, second) => second.count - first.count);
};

const Alerts = () => {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    hazardType: "All Hazard Types",
    alertLevel: "All Alert Levels",
    hazardStatus: "All Statuses",
  });
  const [hazardRecords, setHazardRecords] = useState([]);
  const [hazardTotal, setHazardTotal] = useState(0);
  const [hazardDataSource, setHazardDataSource] = useState("Loading");
  const [hazardLoading, setHazardLoading] = useState(true);
  const [hazardError, setHazardError] = useState("");

  const fetchHazardData = useCallback(async () => {
    setHazardLoading(true);
    setHazardError("");

    try {
      const response = await getHazards({ page: 1, limit: 25 });

      const liveHazards = (response.items || []).map(mapHazardToAlert);
      setHazardRecords(liveHazards);
      setHazardTotal(response.total ?? liveHazards.length);
      setHazardDataSource("Live Phoenix API");
    } catch (error) {
      console.error("Failed to fetch hazard alert data:", error);

      setHazardRecords([]);
      setHazardTotal(0);

      const signInRequired = needsSignIn(error);

      setHazardError(
        signInRequired
          ? "Sign in is required to load hazard records from Phoenix."
          : "Phoenix could not load hazard records right now.",
      );

      setHazardDataSource(
        signInRequired
          ? "Sign in required by Phoenix API"
          : "Phoenix API unavailable",
      );
    } finally {
      setHazardLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHazardData();
  }, [fetchHazardData]);

  const setFilter = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
  };

  //clear all filters actions
  const clearFilters = () => {
    setFilters({
      hazardType: "All Hazard Types",
      alertLevel: "All Alert Levels",
      hazardStatus: "All Statuses",
    });
  };

  const hazardTypeOptions = uniqueBy(
    hazardRecords
      .filter((hazard) => hasValue(hazard.raw.hazard_type))
      .map((hazard) => ({
        value: hazard.raw.hazard_type,
        label: hazard.hazardType,
      })),
    (option) => normalizeGroupText(option.value),
  );

  const alertLevelOptions = uniqueBy(
    hazardRecords
      .filter((hazard) => hasValue(hazard.raw.alert_level))
      .map((hazard) => ({
        value: hazard.raw.alert_level,
        label: hazard.alertLevel,
      })),
    (option) => normalizeGroupText(option.value),
  );

  const statusOptions = uniqueBy(
    hazardRecords
      .filter((hazard) => hasValue(hazard.raw.hazard_status))
      .map((hazard) => ({
        value: hazard.raw.hazard_status,
        label: hazard.status,
      })),
    (option) => normalizeGroupText(option.value),
  );

  const filteredHazards = useMemo(
    () =>
      hazardRecords.filter((hazard) => {
        const matchesType =
          filters.hazardType === "All Hazard Types" ||
          normalizeGroupText(hazard.raw.hazard_type) ===
            normalizeGroupText(filters.hazardType);

        const matchesAlertLevel =
          filters.alertLevel === "All Alert Levels" ||
          normalizeGroupText(hazard.raw.alert_level) ===
            normalizeGroupText(filters.alertLevel);

        const matchesStatus =
          filters.hazardStatus === "All Statuses" ||
          normalizeGroupText(hazard.raw.hazard_status) ===
            normalizeGroupText(filters.hazardStatus);

        return matchesType && matchesAlertLevel && matchesStatus;
      }),
    [filters, hazardRecords],
  );

  const groupedHazards = useMemo(
    () => groupHazards(filteredHazards),
    [filteredHazards],
  );

  const hazardChartRows = useMemo(
    () => buildHazardChartRows(filteredHazards),
    [filteredHazards],
  );

  const priorityHazardCount = filteredHazards.filter((hazard) =>
    ["critical", "high"].includes(statusClassFor(hazard.alertLevel)),
  ).length;

  //Used to distinguish filtered no-results from empty backend data
  const hasActiveFilters =
    filters.hazardType !== "All Hazard Types" ||
    filters.alertLevel !== "All Alert Levels" ||
    filters.hazardStatus !== "All Statuses";

  const openHazard = (hazard) => {
    if (hasValue(hazard?.firstHazardId)) {
      navigate(threatPath(hazard.firstHazardId));
    }
  };

  const renderHazardList = () => {
    if (hazardLoading) {
      return (
        <div className="alerts-empty-state" role="status" aria-live="polite">
          <span className="alerts-state-icon" aria-hidden="true">
            ◌
          </span>
          <strong>Loading hazard alerts</strong>
          <p>Retrieving the latest records from the Phoenix API.</p>
        </div>
      );
    }

    if (hazardError) {
      return (
        <div className="alerts-empty-state alerts-error-state" role="alert">
          <span className="alerts-state-icon" aria-hidden="true">
            !
          </span>
          <strong>{hazardError}</strong>
          <p>Check your connection or sign-in status, then try again.</p>

          <button
            type="button"
            className="alerts-retry-button"
            onClick={fetchHazardData}
          >
            Retry
          </button>
        </div>
      );
    }

    if (hazardRecords.length === 0) {
      return (
        <div className="alerts-empty-state">
          <span className="alerts-state-icon" aria-hidden="true">
            —
          </span>
          <strong>No hazard data available</strong>
          <p>Phoenix returned no hazard records.</p>
        </div>
      );
    }

    if (groupedHazards.length === 0) {
      return (
        <div className="alerts-empty-state">
          <span className="alerts-state-icon" aria-hidden="true">
            ⌕
          </span>
          <strong>No alerts match these filters</strong>
          <p>Clear one or more filters to see additional hazard records.</p>

          <button
            type="button"
            className="alerts-retry-button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="hazard-chart-list">
          {hazardChartRows.map((row) => (
            <div className="hazard-chart-row" key={row.label}>
              <span>{row.label}</span>

              <div className="hazard-chart-track">
                <div
                  className={`hazard-chart-bar ${row.className}`}
                  style={{ width: `${row.width}%` }}
                />
              </div>

              <strong>{row.count}</strong>
            </div>
          ))}

          <div className="priority-guide">
            <span>
              <strong>Emergency</strong>
              Immediate highest-priority alert level from the backend.
            </span>

            <span>
              <strong>High</strong>
              Elevated backend alert level for active review.
            </span>
          </div>
        </div>

        <div className="hazard-list">
          {groupedHazards.map((hazard) => {
            const canOpen = hasValue(hazard.firstHazardId);

            const severityClass = statusClassFor(
              hazard.alertLevel || hazard.status,
            );

            return (
              <article
                className={`hazard-row${
                  canOpen ? " hazard-row-clickable" : ""
                }`}
                key={hazard.id}
                role={canOpen ? "button" : undefined}
                tabIndex={canOpen ? 0 : undefined}
                aria-label={
                  canOpen
                    ? `Open threat details for ${hazard.title}`
                    : undefined
                }
                onClick={canOpen ? () => openHazard(hazard) : undefined}
                onKeyDown={
                  canOpen
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openHazard(hazard);
                        }
                      }
                    : undefined
                }
              >
                <div className="hazard-row-top">
                  <div className="hazard-row-main">
                    <div className="hazard-title-line">
                      <span
                        className={`severity-marker ${severityClass}`}
                        aria-hidden="true"
                      />

                      <strong>{hazard.title}</strong>
                    </div>

                    <small>
                      {hazard.count > 1
                        ? `${hazard.count} matching records grouped by priority, location, status and source.`
                        : "Single backend hazard record."}
                    </small>
                  </div>

                  <div className="hazard-row-badges">
                    {/*Text-based severity label. */}
                    <span className={`severity-label ${severityClass}`}>
                      Severity: {hazard.severityLabel}
                    </span>

                    {hazard.alertLevel && (
                      <span
                        className={`alert-status-pill ${statusClassFor(
                          hazard.alertLevel,
                        )}`}
                      >
                        Priority: {hazard.alertLevel}
                      </span>
                    )}

                    {hazard.status && (
                      <span
                        className={`alert-status-pill ${statusClassFor(hazard.status)}`}
                      >
                        Status: {hazard.status}
                      </span>
                    )}

                    {hazard.count > 1 && (
                      <span className="hazard-count-pill">
                        {hazard.count} matches
                      </span>
                    )}
                  </div>
                </div>

                <div className="alert-card-meta">
                  {(hazard.fields || []).map((field) => (
                    <span key={`${hazard.id}-${field.label}`}>
                      <small>{field.label}</small>
                      <strong>{field.value}</strong>
                    </span>
                  ))}
                </div>

                {/*Timestamp and visible Threat Details action*/}
                <div className="hazard-row-actions">
                  <span className="hazard-timestamp">
                    Updated:{" "}
                    {hazard.latestFormattedTimestamp ||
                      hazard.formattedTimestamp}
                  </span>

                  {canOpen ? (
                    <span className="hazard-open-action">
                      View threat details <span aria-hidden="true">→</span>
                    </span>
                  ) : (
                    <span className="hazard-open-action disabled">
                      Details unavailable
                    </span>
                  )}
                </div>

                {(hazard.evidenceTexts.length > 0 ||
                  hazard.evidenceUrls.length > 0) && (
                  <div className="hazard-evidence-panel">
                    <span>Reported evidence</span>

                    {hazard.evidenceTexts.slice(0, 3).map((text) => (
                      <p key={`${hazard.id}-${text}`}>{text}</p>
                    ))}
                    {hazard.evidenceUrls.slice(0, 2).map((url) => (
                      <a
                        href={url}
                        key={`${hazard.id}-${url}`}
                        rel="noreferrer"
                        target="_blank"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {url}
                      </a>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="alerts-page-layout">
      <div className="alerts-page-header">
        <div>
          <span className="alerts-kicker">Alert operations</span>
          <h2>Alert Notifications</h2>
          <p>Backend hazard alerts grouped by priority, location and status.</p>
        </div>

        <div className="alerts-summary-grid">
          <div className="alerts-summary-card">
            <span>Backend hazards</span>
            <strong>{hazardTotal}</strong>
          </div>

          <div className="alerts-summary-card warning">
            <span>Priority</span>
            <strong>{priorityHazardCount}</strong>
          </div>

          <div className="alerts-summary-card">
            <span>Grouped alerts</span>
            <strong>{groupedHazards.length}</strong>
          </div>
        </div>
      </div>

      <div className="alerts-workspace">
        <main className="alerts-main-content">
          <div className="alert-filter-panel">
            <div className="alert-filter-field">
              <label>Hazard Type</label>
              <select
                value={filters.hazardType}
                onChange={setFilter("hazardType")}
              >
                <option>All Hazard Types</option>
                {hazardTypeOptions.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="alert-filter-field">
              <label>Alert Level</label>
              <select
                value={filters.alertLevel}
                onChange={setFilter("alertLevel")}
              >
                <option>All Alert Levels</option>
                {alertLevelOptions.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="alert-filter-field">
              <label>Hazard Status</label>
              <select
                value={filters.hazardStatus}
                onChange={setFilter("hazardStatus")}
              >
                <option>All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/*Clear filters appears only when filters are active. */}
            {hasActiveFilters && (
              <button
                type="button"
                className="alert-filter-button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="alerts-list-card hazard-alert-card">
            <div className="alerts-list-title">
              <div>
                <h3>Hazards by Alert Priority</h3>
                <p>Endpoint: /api/users/hazards - {hazardDataSource}</p>
              </div>
            </div>

            {/*Filter state is visible beside the list heading. */}
            <span className="alerts-result-count" aria-live="polite">
              {hasActiveFilters ? "Filtered view" : "All alerts"}
            </span>

            {renderHazardList()}
          </div>
        </main>

        <aside className="alerts-side-panel">
          <AlertSidebar />
        </aside>
      </div>
    </div>
  );
};

export default Alerts;
