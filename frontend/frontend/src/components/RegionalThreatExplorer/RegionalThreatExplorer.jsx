import { useEffect, useMemo, useState } from "react";
import "./RegionalThreatExplorer.css";

const DATA_URL = "/data/regional-threats.json";

const ALL = "__ALL__";

const DEFAULT_CENTER = {
  latitude: 15,
  longitude: 15,
};

const DEFAULT_ZOOM = 2;
const SELECTED_ZOOM = 4;
const TILE_SIZE = 256;

const formatLabel = (value) =>
  String(value ?? "Unknown")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const displayValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }

  return String(value);
};

const severityClass = (value) => {
  const text = String(value ?? "").toLowerCase();
  const numeric = Number(value);

  if (
    text.includes("critical") ||
    text.includes("severe") ||
    text.includes("high")
  ) {
    return "rte-severity-high";
  }

  if (
    text.includes("medium") ||
    text.includes("moderate")
  ) {
    return "rte-severity-medium";
  }

  if (
    text.includes("low") ||
    text.includes("minor")
  ) {
    return "rte-severity-low";
  }

  if (Number.isFinite(numeric)) {
    if (numeric >= 0.8 || numeric >= 8) {
      return "rte-severity-high";
    }

    if (numeric >= 0.5 || numeric >= 5) {
      return "rte-severity-medium";
    }

    return "rte-severity-low";
  }

  return "rte-severity-unknown";
};

const normaliseFilterValue = (value) =>
  value === null || value === undefined || value === ""
    ? "Unknown"
    : String(value);

const parseComparableDate = (value) => {
  if (!value) return null;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.getTime();
};

const countBy = (records, accessor) => {
  const counts = new Map();

  records.forEach((record) => {
    const key = normaliseFilterValue(accessor(record));

    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }

    return a[0].localeCompare(b[0]);
  });
};

const longitudeToWorldX = (longitude, zoom) => {
  const scale = 2 ** zoom;

  return ((longitude + 180) / 360) * scale;
};

const latitudeToWorldY = (latitude, zoom) => {
  const limitedLatitude = Math.max(
    -85.05112878,
    Math.min(85.05112878, latitude),
  );

  const latitudeRadians =
    (limitedLatitude * Math.PI) / 180;

  const scale = 2 ** zoom;

  return (
    ((1 -
      Math.log(
        Math.tan(latitudeRadians) +
          1 / Math.cos(latitudeRadians),
      ) /
        Math.PI) /
      2) *
    scale
  );
};

const buildTiles = (center, zoom) => {
  const centerX = longitudeToWorldX(
    center.longitude,
    zoom,
  );

  const centerY = latitudeToWorldY(
    center.latitude,
    zoom,
  );

  const centerTileX = Math.floor(centerX);
  const centerTileY = Math.floor(centerY);
  const tileCount = 2 ** zoom;

  const tiles = [];

  for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
    for (
      let xOffset = -1;
      xOffset <= 1;
      xOffset += 1
    ) {
      const rawX = centerTileX + xOffset;
      const tileY = centerTileY + yOffset;

      if (tileY < 0 || tileY >= tileCount) {
        continue;
      }

      const tileX =
        ((rawX % tileCount) + tileCount) % tileCount;

      tiles.push({
        key: `${zoom}-${rawX}-${tileY}`,
        x: tileX,
        y: tileY,
        xOffset,
        yOffset,
      });
    }
  }

  return {
    tiles,
    centerX,
    centerY,
    centerTileX,
    centerTileY,
  };
};

const projectMarker = (
  latitude,
  longitude,
  center,
  zoom,
) => {
  const centerWorldX = longitudeToWorldX(
    center.longitude,
    zoom,
  );

  const centerWorldY = latitudeToWorldY(
    center.latitude,
    zoom,
  );

  let markerWorldX = longitudeToWorldX(
    longitude,
    zoom,
  );

  const markerWorldY = latitudeToWorldY(
    latitude,
    zoom,
  );

  const worldWidth = 2 ** zoom;

  while (
    markerWorldX - centerWorldX >
    worldWidth / 2
  ) {
    markerWorldX -= worldWidth;
  }

  while (
    markerWorldX - centerWorldX <
    -worldWidth / 2
  ) {
    markerWorldX += worldWidth;
  }

  const x =
    50 +
    ((markerWorldX - centerWorldX) *
      TILE_SIZE *
      100) /
      (TILE_SIZE * 3);

  const y =
    50 +
    ((markerWorldY - centerWorldY) *
      TILE_SIZE *
      100) /
      (TILE_SIZE * 3);

  return {
    x,
    y,
    visible:
      x >= -5 &&
      x <= 105 &&
      y >= -5 &&
      y <= 105,
  };
};

const truncateText = (text, length = 220) => {
  const value = String(text || "");

  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length).trim()}…`;
};

function SummaryGroup({ title, items }) {
  return (
    <div className="rte-summary-group">
      <h4>{title}</h4>

      {items.length === 0 ? (
        <p className="rte-muted">No matching data.</p>
      ) : (
        <div className="rte-summary-items">
          {items.slice(0, 8).map(([label, count]) => (
            <div
              className="rte-summary-row"
              key={`${title}-${label}`}
            >
              <span>{formatLabel(label)}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RegionalThreatExplorer() {
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [regionFilter, setRegionFilter] =
    useState(ALL);

  const [severityFilter, setSeverityFilter] =
    useState(ALL);

  const [hazardTypeFilter, setHazardTypeFilter] =
    useState(ALL);

  const [statusFilter, setStatusFilter] =
    useState(ALL);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [visibleRecordCount, setVisibleRecordCount] =
    useState(20);

  useEffect(() => {
    let active = true;

    const loadDataset = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const response = await fetch(DATA_URL);

        if (!response.ok) {
          throw new Error(
            `Dataset request failed with HTTP ${response.status}.`,
          );
        }

        const result = await response.json();

        if (
          !Array.isArray(result?.records) ||
          !Array.isArray(result?.regions)
        ) {
          throw new Error(
            "Historical threat dataset is incomplete or invalid.",
          );
        }

        if (active) {
          setDataset(result);
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load historical threat data.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDataset();

    return () => {
      active = false;
    };
  }, []);

const records = useMemo(
  () => dataset?.records ?? [],
  [dataset],
);

const regions = useMemo(
  () => dataset?.regions ?? [],
  [dataset],
);

  const regionOptions = useMemo(
    () =>
      [...regions].sort((a, b) =>
        String(a.displayName).localeCompare(
          String(b.displayName),
        ),
      ),
    [regions],
  );

  const severityOptions = useMemo(
    () =>
      [
        ...new Set(
          records.map((record) =>
            normaliseFilterValue(
              record.hazardSeverity,
            ),
          ),
        ),
      ].sort(),
    [records],
  );

  const hazardTypeOptions = useMemo(
    () =>
      [
        ...new Set(
          records.map((record) =>
            normaliseFilterValue(record.hazardType),
          ),
        ),
      ].sort(),
    [records],
  );

  const statusOptions = useMemo(
    () =>
      [
        ...new Set(
          records.map((record) =>
            normaliseFilterValue(
              record.hazardStatus,
            ),
          ),
        ),
      ].sort(),
    [records],
  );

  const filteredRecords = useMemo(() => {
    const startTimestamp = startDate
      ? new Date(`${startDate}T00:00:00`).getTime()
      : null;

    const endTimestamp = endDate
      ? new Date(`${endDate}T23:59:59.999`).getTime()
      : null;

    return records.filter((record) => {
      if (
        regionFilter !== ALL &&
        record.regionKey !== regionFilter
      ) {
        return false;
      }

      if (
        severityFilter !== ALL &&
        normaliseFilterValue(
          record.hazardSeverity,
        ) !== severityFilter
      ) {
        return false;
      }

      if (
        hazardTypeFilter !== ALL &&
        normaliseFilterValue(
          record.hazardType,
        ) !== hazardTypeFilter
      ) {
        return false;
      }

      if (
        statusFilter !== ALL &&
        normaliseFilterValue(
          record.hazardStatus,
        ) !== statusFilter
      ) {
        return false;
      }

      const recordDate =
        parseComparableDate(record.hazardTimestamp) ??
        parseComparableDate(record.timestamp);

      if (
        startTimestamp !== null &&
        (recordDate === null ||
          recordDate < startTimestamp)
      ) {
        return false;
      }

      if (
        endTimestamp !== null &&
        (recordDate === null ||
          recordDate > endTimestamp)
      ) {
        return false;
      }

      return true;
    });
  }, [
    records,
    regionFilter,
    severityFilter,
    hazardTypeFilter,
    statusFilter,
    startDate,
    endDate,
  ]);

  const severityTotals = useMemo(
    () =>
      countBy(
        filteredRecords,
        (record) => record.hazardSeverity,
      ),
    [filteredRecords],
  );

  const hazardTypeTotals = useMemo(
    () =>
      countBy(
        filteredRecords,
        (record) => record.hazardType,
      ),
    [filteredRecords],
  );

  const statusTotals = useMemo(
    () =>
      countBy(
        filteredRecords,
        (record) => record.hazardStatus,
      ),
    [filteredRecords],
  );

  const selectedRegion = useMemo(
    () =>
      regionFilter === ALL
        ? null
        : regions.find(
            (region) =>
              region.regionKey === regionFilter,
          ) || null,
    [regionFilter, regions],
  );

  const mapCenter = useMemo(() => {
    if (
      selectedRegion?.mappingStatus === "mapped" &&
      Number.isFinite(
        Number(selectedRegion.latitude),
      ) &&
      Number.isFinite(
        Number(selectedRegion.longitude),
      )
    ) {
      return {
        latitude: Number(selectedRegion.latitude),
        longitude: Number(
          selectedRegion.longitude,
        ),
      };
    }

    return DEFAULT_CENTER;
  }, [selectedRegion]);

  const mapZoom =
    selectedRegion?.mappingStatus === "mapped"
      ? SELECTED_ZOOM
      : DEFAULT_ZOOM;

  const mapRegions = useMemo(() => {
    const grouped = new Map();

    filteredRecords.forEach((record) => {
      if (
        record.mappingStatus !== "mapped" ||
        !Number.isFinite(Number(record.latitude)) ||
        !Number.isFinite(Number(record.longitude))
      ) {
        return;
      }

      const existing = grouped.get(record.regionKey);

      if (existing) {
        existing.count += 1;
        return;
      }

      grouped.set(record.regionKey, {
        regionKey: record.regionKey,
        displayName: record.regionDisplayName,
        latitude: Number(record.latitude),
        longitude: Number(record.longitude),
        count: 1,
      });
    });

    return [...grouped.values()];
  }, [filteredRecords]);

  const mapTiles = useMemo(
    () => buildTiles(mapCenter, mapZoom),
    [mapCenter, mapZoom],
  );

  const projectedMarkers = useMemo(
    () =>
      mapRegions
        .map((region) => ({
          ...region,
          ...projectMarker(
            region.latitude,
            region.longitude,
            mapCenter,
            mapZoom,
          ),
        }))
        .filter((region) => region.visible),
    [mapRegions, mapCenter, mapZoom],
  );

  const unmappedMatchingCount = useMemo(
    () =>
      filteredRecords.filter(
        (record) =>
          record.mappingStatus !== "mapped",
      ).length,
    [filteredRecords],
  );

  const resetFilters = () => {
    setRegionFilter(ALL);
    setSeverityFilter(ALL);
    setHazardTypeFilter(ALL);
    setStatusFilter(ALL);
    setStartDate("");
    setEndDate("");
    setVisibleRecordCount(20);
  };

  useEffect(() => {
    setVisibleRecordCount(20);
  }, [
    regionFilter,
    severityFilter,
    hazardTypeFilter,
    statusFilter,
    startDate,
    endDate,
  ]);

  if (loading) {
    return (
      <section className="regional-threat-explorer">
        <div className="rte-state-card">
          Loading historical regional threat data…
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="regional-threat-explorer">
        <div
          className="rte-state-card rte-error"
          role="alert"
        >
          <strong>
            Historical threat data could not be loaded.
          </strong>
          <span>{loadError}</span>
        </div>
      </section>
    );
  }

  return (
    <section
      className="regional-threat-explorer"
      aria-labelledby="regional-threat-title"
    >
      <div className="rte-heading-row">
        <div>
          <p className="rte-eyebrow">
            Historical intelligence
          </p>

          <h2 id="regional-threat-title">
            Regional Threat Explorer
          </h2>

          <p className="rte-description">
            Explore historical threat records by
            location, severity, hazard type, status
            and date.
          </p>
        </div>

        <div className="rte-dataset-badge">
          Historical dataset
        </div>
      </div>

      <div className="rte-history-notice">
        <strong>Historical information only.</strong>{" "}
        This dataset is kept separate from live Phoenix
        backend alerts. No historical record is merged
        into the live alert stream.
      </div>

      <div className="rte-filters">
        <label>
          <span>Region</span>

          <select
            value={regionFilter}
            onChange={(event) =>
              setRegionFilter(event.target.value)
            }
          >
            <option value={ALL}>All regions</option>

            {regionOptions.map((region) => (
              <option
                key={`${region.sourceLocation}-${region.regionKey}`}
                value={region.regionKey}
              >
                {region.displayName}
                {region.mappingStatus === "unmapped"
                  ? " — Unmapped"
                  : ""}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Severity</span>

          <select
            value={severityFilter}
            onChange={(event) =>
              setSeverityFilter(event.target.value)
            }
          >
            <option value={ALL}>All severities</option>

            {severityOptions.map((value) => (
              <option key={value} value={value}>
                {formatLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Hazard type</span>

          <select
            value={hazardTypeFilter}
            onChange={(event) =>
              setHazardTypeFilter(event.target.value)
            }
          >
            <option value={ALL}>
              All hazard types
            </option>

            {hazardTypeOptions.map((value) => (
              <option key={value} value={value}>
                {formatLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Status</span>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value={ALL}>All statuses</option>

            {statusOptions.map((value) => (
              <option key={value} value={value}>
                {formatLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>From</span>

          <input
            type="date"
            value={startDate}
            onChange={(event) =>
              setStartDate(event.target.value)
            }
          />
        </label>

        <label>
          <span>To</span>

          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) =>
              setEndDate(event.target.value)
            }
          />
        </label>

        <button
          className="rte-reset-button"
          type="button"
          onClick={resetFilters}
        >
          Reset filters
        </button>
      </div>

      <div className="rte-overview-grid">
        <article className="rte-metric-card">
          <span>Matching records</span>
          <strong>{filteredRecords.length}</strong>
          <small>
            of {records.length} historical records
          </small>
        </article>

        <article className="rte-metric-card">
          <span>Regions represented</span>
          <strong>{mapRegions.length}</strong>
          <small>mapped regions in current result</small>
        </article>

        <article className="rte-metric-card">
          <span>Unmapped records</span>
          <strong>{unmappedMatchingCount}</strong>
          <small>
            preserved without invented coordinates
          </small>
        </article>

        <article className="rte-metric-card">
          <span>Selected region</span>
          <strong className="rte-region-name">
            {selectedRegion?.displayName ||
              "All regions"}
          </strong>
          <small>
            {selectedRegion?.country ||
              "Global historical dataset"}
          </small>
        </article>
      </div>

      <div className="rte-content-grid">
        <div className="rte-map-card">
          <div className="rte-card-heading">
            <div>
              <h3>Regional threat map</h3>
              <p>
                One aggregated marker is shown per
                mapped location.
              </p>
            </div>

            <span>
              {mapRegions.length} mapped locations
            </span>
          </div>

          <div className="rte-map">
            <div className="rte-map-tiles">
              {mapTiles.tiles.map((tile) => {
                const centerFractionX =
                  mapTiles.centerX -
                  mapTiles.centerTileX;

                const centerFractionY =
                  mapTiles.centerY -
                  mapTiles.centerTileY;

                const left =
                  50 +
                  (tile.xOffset -
                    centerFractionX) *
                    (100 / 3);

                const top =
                  50 +
                  (tile.yOffset -
                    centerFractionY) *
                    (100 / 3);

                return (
                  <img
                    key={tile.key}
                    className="rte-map-tile"
                    src={`https://tile.openstreetmap.org/${mapZoom}/${tile.x}/${tile.y}.png`}
                    alt=""
                    loading="lazy"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                    }}
                  />
                );
              })}
            </div>

            <div className="rte-map-marker-layer">
              {projectedMarkers.map((marker) => {
                const selected =
                  marker.regionKey === regionFilter;

                return (
                  <button
                    key={marker.regionKey}
                    type="button"
                    className={`rte-map-marker ${
                      selected
                        ? "rte-map-marker-selected"
                        : ""
                    }`}
                    style={{
                      left: `${marker.x}%`,
                      top: `${marker.y}%`,
                    }}
                    title={`${marker.displayName}: ${marker.count} records`}
                    onClick={() =>
                      setRegionFilter(marker.regionKey)
                    }
                  >
                    <span>{marker.count}</span>
                  </button>
                );
              })}
            </div>

            {projectedMarkers.length === 0 && (
              <div className="rte-map-empty">
                No mapped locations match the current
                filters.
              </div>
            )}

            <div className="rte-map-attribution">
              © OpenStreetMap contributors
            </div>
          </div>

          {selectedRegion?.mappingStatus ===
            "unmapped" && (
            <div className="rte-unmapped-message">
              <strong>
                {selectedRegion.displayName}
              </strong>{" "}
              has been reviewed but intentionally has
              no single map coordinate because a
              precise point would be misleading.
            </div>
          )}
        </div>

        <div className="rte-summary-card">
          <div className="rte-card-heading">
            <div>
              <h3>Matching totals</h3>
              <p>
                Totals update automatically with every
                filter.
              </p>
            </div>
          </div>

          <SummaryGroup
            title="Severity"
            items={severityTotals}
          />

          <SummaryGroup
            title="Hazard type"
            items={hazardTypeTotals}
          />

          <SummaryGroup
            title="Status"
            items={statusTotals}
          />
        </div>
      </div>

      <div className="rte-records-card">
        <div className="rte-card-heading rte-record-heading">
          <div>
            <h3>Historical threat records</h3>
            <p>
              Showing{" "}
              {Math.min(
                visibleRecordCount,
                filteredRecords.length,
              )}{" "}
              of {filteredRecords.length} matching
              records.
            </p>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="rte-empty-state">
            <strong>No matching records.</strong>
            <p>
              Change or reset the filters to view
              historical threat records.
            </p>

            <button
              type="button"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          </div>
        ) : (
          <>
            <div className="rte-record-list">
              {filteredRecords
                .slice(0, visibleRecordCount)
                .map((record) => (
                  <article
                    className="rte-record"
                    key={record.id}
                  >
                    <div className="rte-record-top">
                      <div>
                        <span className="rte-record-region">
                          {record.regionDisplayName ||
                            "Unmapped"}
                        </span>

                        <span
                          className={`rte-severity-pill ${severityClass(
                            record.hazardSeverity,
                          )}`}
                        >
                          Severity:{" "}
                          {displayValue(
                            record.hazardSeverity,
                          )}
                        </span>
                      </div>

                      <span className="rte-record-status">
                        {formatLabel(
                          record.hazardStatus,
                        )}
                      </span>
                    </div>

                    <p className="rte-record-text">
                      {truncateText(record.text)}
                    </p>

                    <div className="rte-record-details">
                      <span>
                        <strong>Hazard:</strong>{" "}
                        {formatLabel(
                          record.hazardType,
                        )}
                      </span>

                      <span>
                        <strong>Source:</strong>{" "}
                        {displayValue(record.source)}
                      </span>

                      <span>
                        <strong>Alert:</strong>{" "}
                        {formatLabel(
                          record.alertLevel,
                        )}
                      </span>

                      <span>
                        <strong>Timestamp:</strong>{" "}
                        {record.hazardTimestamp
                          ? new Date(
                              record.hazardTimestamp,
                            ).toLocaleString()
                          : record.timestamp
                            ? new Date(
                                record.timestamp,
                              ).toLocaleString()
                            : "Unavailable"}
                      </span>
                    </div>

                    {record.url ? (
                      <a
                        className="rte-record-link"
                        href={record.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open source
                      </a>
                    ) : (
                      <span className="rte-no-link">
                        Source URL unavailable
                      </span>
                    )}
                  </article>
                ))}
            </div>

            {visibleRecordCount <
              filteredRecords.length && (
              <button
                className="rte-load-more"
                type="button"
                onClick={() =>
                  setVisibleRecordCount(
                    (count) => count + 20,
                  )
                }
              >
                Load 20 more
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}