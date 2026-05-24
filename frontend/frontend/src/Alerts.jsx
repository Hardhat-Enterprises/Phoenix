import { useEffect, useMemo, useState } from "react";
import AlertSidebar from "./components/AlertSidebar";
import { getHazards } from "./services/phoenixApi";
import "./Alerts.css";

const formatLabel = (value) =>
  String(value || "Unknown")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const needsSignIn = (error) =>
  String(error?.message || "").toLowerCase().includes("sign in");

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

const normalizeGroupText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/unkown/g, "unknown")
    .replace(/\s+/g, " ");

const cleanLocation = (value) => {
  const normalized = normalizeGroupText(value);

  if (!normalized || normalized === "unknown") {
    return "Unknown";
  }

  return String(value).trim();
};

const formatSource = (value) =>
  hasValue(value) ? formatLabel(value) : "";

const formatHazardSeverity = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "";
  }

  return number <= 1 ? `${Math.round(number * 100)}%` : `${number}%`;
};

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

  return {
    id: hazard.hazard_event_id || hazard.id || `hazard-alert-${index}`,
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
    fields,
    raw: hazard,
  };
};

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
        hasValue(hazard.evidenceText) &&
        !existing.evidenceTexts.some(
          (text) => normalizeGroupText(text) === normalizeGroupText(hazard.evidenceText),
        )
      ) {
        existing.evidenceTexts.push(hazard.evidenceText);
      }

      if (
        hasValue(hazard.evidenceUrl) &&
        !existing.evidenceUrls.some(
          (url) => normalizeGroupText(url) === normalizeGroupText(hazard.evidenceUrl),
        )
      ) {
        existing.evidenceUrls.push(hazard.evidenceUrl);
      }

      return;
    }

    groups.set(key, {
      ...hazard,
      id: key,
      count: 1,
      evidenceTexts: hasValue(hazard.evidenceText) ? [hazard.evidenceText] : [],
      evidenceUrls: hasValue(hazard.evidenceUrl) ? [hazard.evidenceUrl] : [],
    });
  });

  return [...groups.values()];
};

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
      width: maxCount > 0 ? Math.max(12, Math.round((count / maxCount) * 100)) : 0,
    }))
    .sort((first, second) => second.count - first.count);
};

const Alerts = () => {
  const [filters, setFilters] = useState({
    hazardType: "All Hazard Types",
    alertLevel: "All Alert Levels",
    hazardStatus: "All Statuses",
  });
  const [hazardRecords, setHazardRecords] = useState([]);
  const [hazardTotal, setHazardTotal] = useState(0);
  const [hazardDataSource, setHazardDataSource] = useState("Loading");
  const [hazardLoading, setHazardLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const fetchHazardData = async () => {
      setHazardLoading(true);

      try {
        const response = await getHazards({ page: 1, limit: 25 });

        if (!isActive) {
          return;
        }

        const liveHazards = (response.items || []).map(mapHazardToAlert);
        setHazardRecords(liveHazards);
        setHazardTotal(response.total ?? liveHazards.length);
        setHazardDataSource("Live Phoenix API");
      } catch (error) {
        console.error("Failed to fetch hazard alert data:", error);

        if (!isActive) {
          return;
        }

        setHazardRecords([]);
        setHazardTotal(0);
        setHazardDataSource(
          needsSignIn(error)
            ? "Sign in required by Phoenix API"
            : "Phoenix API unavailable",
        );
      } finally {
        if (isActive) {
          setHazardLoading(false);
        }
      }
    };

    fetchHazardData();

    return () => {
      isActive = false;
    };
  }, []);

  const setFilter = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
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

  return (
    <div className="alerts-page-layout">
      <div className="alerts-page-header">
        <div>
          <span className="alerts-kicker">Alert operations</span>
          <h2>Alert Notifications</h2>
          <p>
            Backend hazard alerts grouped by priority, location and status.
          </p>
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
              <select value={filters.hazardType} onChange={setFilter("hazardType")}>
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
              <select value={filters.alertLevel} onChange={setFilter("alertLevel")}>
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
              <select value={filters.hazardStatus} onChange={setFilter("hazardStatus")}>
                <option>All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="alerts-list-card hazard-alert-card">
            <div className="alerts-list-title">
              <div>
                <h3>Hazards by Alert Priority</h3>
                <p>
                  Endpoint: /api/users/hazards - {hazardDataSource}
                </p>
              </div>
            </div>

            {hazardChartRows.length > 0 ? (
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
                  {groupedHazards.map((hazard) => (
                    <article className="hazard-row" key={hazard.id}>
                      <div className="hazard-row-top">
                        <div className="hazard-row-main">
                          <strong>{hazard.title}</strong>
                          <small>
                            Grouped by matching alert priority, location and status.
                          </small>
                        </div>

                        <div className="hazard-row-badges">
                          {hazard.count > 1 && (
                            <span className="hazard-count-pill">
                              {hazard.count} matches
                            </span>
                          )}

                          {hazard.alertLevel && (
                            <span
                              className={`alert-status-pill ${statusClassFor(
                                hazard.alertLevel,
                              )}`}
                            >
                              {hazard.alertLevel}
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
                            >
                              {url}
                            </a>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="alerts-empty-state">
                {hazardLoading
                  ? "Loading hazard records from the Phoenix API..."
                  : hazardDataSource === "Sign in required by Phoenix API"
                    ? "Sign in to load hazard records from /api/users/hazards."
                    : "No hazard records returned from /api/users/hazards."}
              </div>
            )}
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
