import { useEffect, useMemo, useState } from "react";
import {
  getApiHealth,
  getDashboardActivity,
  getDashboardCharts,
  getDashboardOverview,
  getIntegrations,
  getHazards,
  getLocations,
  getRisks,
  getThreats,
  postIngestionAnomaly,
} from "./services/phoenixApi";
import "./Dashboard.css";

const formatLabel = (value) =>
  String(value || "Unknown")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const severityClassFor = (value) => {
  const normalized = String(value || "").toLowerCase();

  if (normalized.includes("critical") || normalized.includes("high")) return "unsafe";
  if (normalized.includes("medium") || normalized.includes("investigating")) return "unverified";
  return "safe";
};

const DEFAULT_MAP_BOUNDS = {
  minLatitude: -44.5,
  maxLatitude: -10,
  minLongitude: 112,
  maxLongitude: 154.5,
};

const DEFAULT_MAP_ZOOM = 4;
const OSM_TILE_URL = "https://tile.openstreetmap.org";

const STATE_LOCATION_FALLBACKS = {
  ACT: { label: "Australian Capital Territory", latitude: -35.2809, longitude: 149.13 },
  NSW: { label: "New South Wales", latitude: -33.8688, longitude: 151.2093 },
  NT: { label: "Northern Territory", latitude: -12.4634, longitude: 130.8456 },
  QLD: { label: "Queensland", latitude: -27.4698, longitude: 153.0251 },
  SA: { label: "South Australia", latitude: -34.9285, longitude: 138.6007 },
  TAS: { label: "Tasmania", latitude: -42.8821, longitude: 147.3272 },
  VIC: { label: "Victoria", latitude: -37.8136, longitude: 144.9631 },
  WA: { label: "Western Australia", latitude: -31.9523, longitude: 115.8613 },
};

const STATE_ALIASES = {
  ACT: ["act", "australian capital territory", "canberra"],
  NSW: ["nsw", "new south wales", "sydney"],
  NT: ["nt", "northern territory", "darwin"],
  QLD: ["qld", "queensland", "brisbane", "townsville"],
  SA: ["sa", "south australia", "adelaide"],
  TAS: ["tas", "tasmania", "hobart"],
  VIC: ["vic", "victoria", "melbourne", "gippsland"],
  WA: ["wa", "western australia", "perth"],
};

const normalizeLookupText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");

const readNumber = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
};

const severityRankFor = (value) => {
  const number = Number(value);

  if (Number.isFinite(number)) {
    if (number >= 0.8) return "critical";
    if (number >= 0.6) return "high";
    if (number >= 0.4) return "medium";
    return "low";
  }

  const normalized = String(value || "").toLowerCase();

  if (normalized.includes("critical") || normalized.includes("emergency")) {
    return "critical";
  }

  if (normalized.includes("high")) {
    return "high";
  }

  if (normalized.includes("medium") || normalized.includes("warning")) {
    return "medium";
  }

  return "low";
};

const longitudeToTileX = (longitude, zoom) =>
  ((longitude + 180) / 360) * 2 ** zoom;

const latitudeToTileY = (latitude, zoom) => {
  const latitudeRadians = (latitude * Math.PI) / 180;

  return (
    ((1 -
      Math.log(
        Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians),
      ) /
        Math.PI) /
      2) *
    2 ** zoom
  );
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const zoomForBounds = (bounds) => {
  const span = Math.max(
    bounds.maxLatitude - bounds.minLatitude,
    bounds.maxLongitude - bounds.minLongitude,
  );

  if (span <= 0.4) return 11;
  if (span <= 1) return 10;
  if (span <= 2.5) return 9;
  if (span <= 5) return 8;
  if (span <= 10) return 7;
  if (span <= 18) return 6;

  return DEFAULT_MAP_ZOOM;
};

const buildMapBounds = (points) => {
  if (points.length === 0) {
    return {
      ...DEFAULT_MAP_BOUNDS,
      zoom: DEFAULT_MAP_ZOOM,
    };
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitudePadding = Math.max(0.18, (maxLatitude - minLatitude) * 0.7);
  const longitudePadding = Math.max(0.24, (maxLongitude - minLongitude) * 0.7);
  const bounds = {
    minLatitude: clamp(
      minLatitude - latitudePadding,
      DEFAULT_MAP_BOUNDS.minLatitude,
      DEFAULT_MAP_BOUNDS.maxLatitude,
    ),
    maxLatitude: clamp(
      maxLatitude + latitudePadding,
      DEFAULT_MAP_BOUNDS.minLatitude,
      DEFAULT_MAP_BOUNDS.maxLatitude,
    ),
    minLongitude: clamp(
      minLongitude - longitudePadding,
      DEFAULT_MAP_BOUNDS.minLongitude,
      DEFAULT_MAP_BOUNDS.maxLongitude,
    ),
    maxLongitude: clamp(
      maxLongitude + longitudePadding,
      DEFAULT_MAP_BOUNDS.minLongitude,
      DEFAULT_MAP_BOUNDS.maxLongitude,
    ),
  };

  return {
    ...bounds,
    zoom: zoomForBounds(bounds),
  };
};

const buildTileView = (bounds) => ({
  zoom: bounds.zoom,
  minX: longitudeToTileX(bounds.minLongitude, bounds.zoom),
  maxX: longitudeToTileX(bounds.maxLongitude, bounds.zoom),
  minY: latitudeToTileY(bounds.maxLatitude, bounds.zoom),
  maxY: latitudeToTileY(bounds.minLatitude, bounds.zoom),
});

const buildMapTiles = (view) =>
  Array.from(
    {
      length: Math.ceil(view.maxX) - Math.floor(view.minX) + 1,
    },
    (_, xIndex) => Math.floor(view.minX) + xIndex,
  ).flatMap((x) =>
    Array.from(
      {
        length: Math.ceil(view.maxY) - Math.floor(view.minY) + 1,
      },
      (_, yIndex) => {
        const y = Math.floor(view.minY) + yIndex;

        return {
          key: `${view.zoom}-${x}-${y}`,
          src: `${OSM_TILE_URL}/${view.zoom}/${x}/${y}.png`,
          left: ((x - view.minX) / (view.maxX - view.minX)) * 100,
          top: ((y - view.minY) / (view.maxY - view.minY)) * 100,
          width: 100 / (view.maxX - view.minX),
          height: 100 / (view.maxY - view.minY),
        };
      },
    ),
  );

const projectToMap = (latitude, longitude, view) => {
  const left =
    ((longitudeToTileX(longitude, view.zoom) - view.minX) /
      (view.maxX - view.minX)) *
    100;
  const top =
    ((latitudeToTileY(latitude, view.zoom) - view.minY) /
      (view.maxY - view.minY)) *
    100;

  return {
    left: Math.min(94, Math.max(6, left)),
    top: Math.min(92, Math.max(8, top)),
  };
};

const stateCodeFor = (value) => {
  const normalized = normalizeLookupText(value);

  return Object.entries(STATE_ALIASES).find(([, aliases]) =>
    aliases.some(
      (alias) =>
        normalized === alias ||
        (alias.length > 3 && normalized.includes(alias)),
    ),
  )?.[0];
};

const getLocationLabel = (location) =>
  [
    location?.suburb,
    location?.local_government_area,
    location?.state_region,
  ]
    .filter(Boolean)
    .join(", ");

const locationMatchesHazard = (location, hazardLocation, hazard) => {
  if (
    hazard?.geo_location_id &&
    location?.geo_location_id === hazard.geo_location_id
  ) {
    return true;
  }

  const target = normalizeLookupText(hazardLocation);

  if (!target) {
    return false;
  }

  const candidates = [
    location?.state_region,
    location?.local_government_area,
    location?.suburb,
    getLocationLabel(location),
  ].map(normalizeLookupText);

  if (candidates.some((candidate) => candidate === target)) {
    return true;
  }

  const stateCode = stateCodeFor(target);

  return Boolean(
    stateCode &&
      candidates.some((candidate) =>
        STATE_ALIASES[stateCode].includes(candidate),
      ),
  );
};

const findHazardCoordinates = (hazard, locations) => {
  const directLatitude = readNumber(hazard.latitude, hazard.lat);
  const directLongitude = readNumber(hazard.longitude, hazard.lng, hazard.lon);

  if (directLatitude !== null && directLongitude !== null) {
    return {
      latitude: directLatitude,
      longitude: directLongitude,
      label: hazard.hazard_location || hazard.location || "Backend coordinates",
      source: "Hazard record",
      isApproximate: false,
    };
  }

  const hazardLocation =
    hazard.hazard_location ||
    hazard.location ||
    hazard.region ||
    hazard.state_region ||
    hazard.suburb ||
    "";
  const matchedLocation = locations.find((location) =>
    locationMatchesHazard(location, hazardLocation, hazard),
  );

  if (matchedLocation) {
    return {
      latitude: readNumber(matchedLocation.latitude),
      longitude: readNumber(matchedLocation.longitude),
      label: getLocationLabel(matchedLocation) || hazardLocation,
      source: "Backend location",
      isApproximate: false,
    };
  }

  const fallback = STATE_LOCATION_FALLBACKS[stateCodeFor(hazardLocation)];

  if (fallback) {
    return {
      latitude: fallback.latitude,
      longitude: fallback.longitude,
      label: hazardLocation || fallback.label,
      source: "Approximate from backend location",
      isApproximate: true,
    };
  }

  return null;
};

const buildRiskMapPoints = (hazards, locations) =>
  hazards
    .map((hazard, index) => {
      const coordinates = findHazardCoordinates(hazard, locations);

      if (!coordinates) {
        return null;
      }

      const severity =
        hazard.severity_level ||
        hazard.hazard_severity ||
        hazard.alert_level ||
        hazard.risk_level ||
        "Unknown";
      return {
        id: hazard.hazard_event_id || hazard.id || `map-point-${index}`,
        type: formatLabel(hazard.hazard_type || "Hazard"),
        severity: formatLabel(severity),
        status: formatLabel(
          hazard.event_status ||
            hazard.hazard_status ||
            hazard.status ||
            "Unknown",
        ),
        location: coordinates.label,
        source: coordinates.source,
        isApproximate: coordinates.isApproximate,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        tone: severityRankFor(severity),
      };
    })
    .filter(Boolean)
    .slice(0, 8);

const groupRiskMapPoints = (points) => {
  const groups = new Map();

  points.forEach((point) => {
    const key = [
      point.type,
      point.location,
      point.severity,
      point.status,
      point.tone,
      point.isApproximate ? "approximate" : "exact",
    ].join("|");
    const existing = groups.get(key);

    if (existing) {
      existing.count += 1;
      existing.latitude =
        (existing.latitude * (existing.count - 1) + point.latitude) /
        existing.count;
      existing.longitude =
        (existing.longitude * (existing.count - 1) + point.longitude) /
        existing.count;
      return;
    }

    groups.set(key, {
      ...point,
      id: key,
      count: 1,
    });
  });

  return [...groups.values()];
};

const barClassFor = (value) => {
  const normalized = String(value || "").toLowerCase();

  if (normalized.includes("critical")) return "critical";
  if (normalized.includes("high")) return "high";
  if (normalized.includes("medium")) return "medium";
  return "low";
};

const riskValueFor = (riskLevel, confidenceScore) => {
  const numericConfidence = Number(confidenceScore);

  if (Number.isFinite(numericConfidence) && numericConfidence > 0) {
    return Math.min(
      100,
      Math.round(
        numericConfidence <= 1
          ? numericConfidence * 100
          : numericConfidence
      )
    );
  }

  const normalized = String(riskLevel || "").toLowerCase();

  if (normalized.includes("critical")) return 100;
  if (normalized.includes("high")) return 80;
  if (normalized.includes("medium")) return 55;
  if (normalized.includes("low")) return 30;
  return 15;
};

const anomalyRegions = [
  {
    id: "VIC_GIPPSLAND",
    label: "VIC Gippsland",
    minLatitude: -37.8,
    maxLatitude: -37.1,
    minLongitude: 147.2,
    maxLongitude: 148.5,
  },
  {
    id: "NSW_SYDNEY",
    label: "NSW Sydney",
    minLatitude: -34.0,
    maxLatitude: -33.6,
    minLongitude: 150.8,
    maxLongitude: 151.4,
  },
  {
    id: "NSW_NEWCASTLE",
    label: "NSW Newcastle",
    minLatitude: -33.1,
    maxLatitude: -32.8,
    minLongitude: 151.6,
    maxLongitude: 152.2,
  },
  {
    id: "VIC_MELBOURNE",
    label: "VIC Melbourne",
    minLatitude: -38.2,
    maxLatitude: -37.5,
    minLongitude: 144.7,
    maxLongitude: 145.5,
  },
  {
    id: "QLD_TOWNSVILLE",
    label: "QLD Townsville",
    minLatitude: -19.5,
    maxLatitude: -19.1,
    minLongitude: 146.7,
    maxLongitude: 147.2,
  },
  {
    id: "QLD_BRISBANE",
    label: "QLD Brisbane",
    minLatitude: -27.7,
    maxLatitude: -27.3,
    minLongitude: 152.9,
    maxLongitude: 153.4,
  },
  {
    id: "WA_PERTH",
    label: "WA Perth",
    minLatitude: -32.3,
    maxLatitude: -31.7,
    minLongitude: 115.6,
    maxLongitude: 116.2,
  },
  {
    id: "SA_ADELAIDE",
    label: "SA Adelaide",
    minLatitude: -34.9,
    maxLatitude: -34.7,
    minLongitude: 138.5,
    maxLongitude: 138.8,
  },
  {
    id: "SA_PORT_ADELAIDE",
    label: "SA Port Adelaide",
    minLatitude: -34.95,
    maxLatitude: -34.8,
    minLongitude: 138.48,
    maxLongitude: 138.65,
  },
  {
    id: "TAS_HOBART",
    label: "TAS Hobart",
    minLatitude: -43.0,
    maxLatitude: -42.6,
    minLongitude: 147.2,
    maxLongitude: 147.6,
  },
  {
    id: "NT_DARWIN",
    label: "NT Darwin",
    minLatitude: -12.6,
    maxLatitude: -12.3,
    minLongitude: 130.8,
    maxLongitude: 131.0,
  },
  {
    id: "ACT_CANBERRA",
    label: "ACT Canberra",
    minLatitude: -35.4,
    maxLatitude: -35.1,
    minLongitude: 149.0,
    maxLongitude: 149.3,
  },
];

const DASHBOARD_CACHE_KEY = "phoenixDashboardSnapshot";

const pause = (delayMs) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

const getCurrentDateTimeLocal = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const toIsoTimestamp = (value) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const toModelTimeWindow = (value) => {
  if (!value) {
    return getCurrentDateTimeLocal().replace("T", " ") + ":00";
  }

  return value.includes("T") ? `${value.replace("T", " ")}:00` : value;
};

const getIntegrationTime = (integration) => {
  const output = integration?.output?.output || integration?.output || {};
  const metadata = integration?.metadata || integration?.output?.metadata || {};
  const rawTime =
    metadata.processed_at ||
    output.processed_at ||
    integration?.updated_at ||
    integration?.created_at;
  const time = new Date(rawTime).getTime();

  return Number.isFinite(time) ? time : 0;
};

const sortNewestFirst = (items) =>
  [...items].sort(
    (first, second) => getIntegrationTime(second) - getIntegrationTime(first),
  );

const formatScore = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return number <= 1 ? number.toFixed(2) : `${Math.round(number)}%`;
};

const formatConfidence = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return number <= 1 ? `${Math.round(number * 100)}%` : `${Math.round(number)}%`;
};

const formatShortDate = (value) => {
  if (!value) {
    return "Recent";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
};

const buildAnomalyPayload = (region, timestamp) => ({
  time_window: toModelTimeWindow(timestamp),
  timestamp: toIsoTimestamp(timestamp),
  region_id: region.id,
  region_min_latitude: region.minLatitude,
  region_max_latitude: region.maxLatitude,
  region_min_longitude: region.minLongitude,
  region_max_longitude: region.maxLongitude,
});

const readDashboardSnapshot = () => {
  try {
    const storedSnapshot = localStorage.getItem(DASHBOARD_CACHE_KEY);
    return storedSnapshot ? JSON.parse(storedSnapshot) : null;
  } catch {
    localStorage.removeItem(DASHBOARD_CACHE_KEY);
    return null;
  }
};

const saveDashboardSnapshot = (snapshot) => {
  try {
    localStorage.setItem(
      DASHBOARD_CACHE_KEY,
      JSON.stringify({
        ...snapshot,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Storage can be unavailable in private browsing; the live dashboard still works.
  }
};

const normalizeAnomalyResult = (result, fallbackRegion) => {
  const data = result?.data && typeof result.data === "object" ? result.data : result || {};
  const input = data.input || data.input_payload || {};
  const output = data.output?.output || data.output || {};
  const metadata = data.metadata || data.output?.metadata || {};

  return {
    integrationId: data.integration_id || data.integration_event_id,
    status: data.status || "completed",
    message: data.message || "",
    regionId: input.region_id || data.region_id || fallbackRegion?.id,
    regionLabel: fallbackRegion?.label || formatLabel(input.region_id || data.region_id),
    anomalyScore: output.anomaly_score ?? data.anomaly_score ?? data.score,
    isAnomaly: output.is_anomaly ?? data.is_anomaly,
    riskLevel: output.risk_level || data.risk_level,
    confidenceScore: output.confidence_score ?? data.confidence_score,
    drivers: output.main_drivers || data.main_drivers || [],
    firmsEventCount: input.firms_event_count,
    firmsAvgBrightness: input.firms_avg_brightness,
    firmsSources: input.firms_sources,
    modelVersion: metadata.model_version,
    source: metadata.source,
    processedAt:
      metadata.processed_at ||
      output.processed_at ||
      data.processed_at ||
      data.updated_at ||
      data.created_at,
  };
};

const normalizeAnomalyIntegration = (integration) => {
  const input = integration.input || {};
  const output = integration.output?.output || integration.output || {};
  const metadata = integration.output?.metadata || {};
  const region = anomalyRegions.find(
    (item) => item.id === input.region_id || item.id === output.region_id,
  );

  return normalizeAnomalyResult(
    {
      ...integration,
      input,
      output,
      metadata,
      status: integration.status,
      integration_event_id: integration.integration_event_id,
    },
    region,
  );
};

const isAnomalyIntegration = (integration) =>
  integration?.integration_type === "anomaly";

const normalizeThreatRow = (threat, index) => {
  const vulnerability = formatLabel(
    threat.risk_level || threat.severity || "Unknown"
  );
  const threatType = formatLabel(
    threat.threat_type || threat.category || "Threat Signal"
  );
  const detectedAt = threat.detected_at || threat.created_at;
  const region = threat.region || threat.location || "National feed";

  return {
    id: threat.threat_id || threat.id || threat.title || `threat-${index}`,
    name: threat.title || threatType,
    vulnerability,
    status: formatLabel(threat.status || "In Review"),
    className: severityClassFor(vulnerability),
    description:
      threat.description ||
      `${threatType} detected in the Phoenix backend activity feed.`,
    source: formatLabel(threat.category || threat.threat_type || "Phoenix API"),
    region,
    meta: `${formatLabel(region)} | ${formatShortDate(detectedAt)}`,
    riskValue: riskValueFor(
      vulnerability,
      threat.confidence_score
    ),
    detectedAt,
    raw: threat,
  };
};

const normalizeThreatChartRows = (threatsByRiskLevel = {}) => {
  const riskLevels = ["critical", "high", "medium", "low"];
  const counts = riskLevels.map((riskLevel) =>
    Number(threatsByRiskLevel[riskLevel] ?? 0)
  );
  const maxCount = Math.max(...counts, 0);

  return riskLevels
    .map((riskLevel, index) => {
      const count = counts[index];
      const severity = formatLabel(riskLevel);

      return {
        id: `threat-chart-${riskLevel}`,
        name: severity,
        severity,
        count,
        riskValue:
          maxCount > 0
            ? Math.max(8, Math.round((count / maxCount) * 100))
            : 0,
      };
    })
    .filter((row) => row.count > 0);
};

const normalizeHazardRow = (hazard, index) => ({
  id:
    hazard.hazard_event_id ||
    hazard.id ||
    hazard.hazard_type ||
    `hazard-${index}`,
  type: formatLabel(hazard.hazard_type || "Hazard"),
  severity: formatLabel(
    hazard.severity_level ||
      hazard.hazard_severity ||
      hazard.alert_level ||
      "Unknown",
  ),
  status: formatLabel(
    hazard.event_status ||
      hazard.hazard_status ||
      hazard.status ||
      "Unknown",
  ),
});

function Dashboard({ setPage, setSelectedThreat, isLoggedIn }) {

  const [apiStatus, setApiStatus] = useState("Checking");
  const [threats, setThreats] = useState([]);
  const [threatsByRiskLevel, setThreatsByRiskLevel] = useState({});
  const [hazards, setHazards] = useState([]);
  const [locations, setLocations] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [riskTotal, setRiskTotal] = useState("Checking");
  const [threatTotal, setThreatTotal] = useState("Checking");
  const [hazardTotal, setHazardTotal] = useState("Checking");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  //Anomaly detection state
  const [selectedRegionId, setSelectedRegionId] =
    useState("VIC_GIPPSLAND");
  const [selectedTimestamp, setSelectedTimestamp] =
    useState(getCurrentDateTimeLocal);

  const [loadingDetection, setLoadingDetection] =
    useState(false);

  const [apiResult, setApiResult] = useState(null);
  const [detectionMessage, setDetectionMessage] = useState("");
  const [detectionMessageTone, setDetectionMessageTone] =
    useState("success");
  const [detectionError, setDetectionError] = useState("");

  const showDetectionMessage = (message, tone = "success") => {
    setDetectionMessage(message);
    setDetectionMessageTone(tone);
  };

  const applyDashboardSnapshot = (snapshot) => {
    const totals = snapshot?.totals || {};

    setThreats(snapshot?.threats || []);
    setThreatsByRiskLevel(snapshot?.threatsByRiskLevel || {});
    setHazards(snapshot?.hazards || []);
    setLocations(snapshot?.locations || []);
    setIntegrations(snapshot?.integrations || []);
    setThreatTotal(totals.threats ?? 0);
    setHazardTotal(totals.hazards ?? 0);
    setRiskTotal(totals.risks ?? 0);
  };

  const selectedRegion = useMemo(
    () =>
      anomalyRegions.find((region) => region.id === selectedRegionId) ||
      anomalyRegions[0],
    [selectedRegionId]
  );

  const loadIntegrations = async () => {
    if (!isLoggedIn) {
      setIntegrations([]);
      return [];
    }

    try {
      const response = await getIntegrations({ page: 1, limit: 25 });
      const items = sortNewestFirst(response.items || []);
      setIntegrations(items);
      return items;
    } catch {
      setIntegrations([]);
      return [];
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadDashboardData = async () => {
      setIsLoading(true);
      setLoadError("");

      const healthResult = await Promise.resolve(getApiHealth()).then(
        (value) => ({ status: "fulfilled", value }),
        (reason) => ({ status: "rejected", reason }),
      );

      if (!isActive) {
        return;
      }

      setApiStatus(
        healthResult.status === "fulfilled"
          ? "Online"
          : "Unavailable"
      );

      if (!isLoggedIn) {
        applyDashboardSnapshot(readDashboardSnapshot());
        setIsLoading(false);
        return;
      }

      const results = await Promise.allSettled([
        getDashboardOverview(),
        getDashboardCharts(),
        getDashboardActivity(),
        getHazards({ page: 1, limit: 4 }),
        getLocations(),
        getThreats({ page: 1, limit: 4 }),
        getRisks({ page: 1, limit: 25 }),
        getIntegrations({ page: 1, limit: 25 }),
      ]);

      if (!isActive) return;

      const [
        overviewResult,
        chartsResult,
        activityResult,
        hazardsResult,
        locationsResult,
        threatsResult,
        risksResult,
        integrationsResult,
      ] = results;
      const allDataRequestsFailed = [
        overviewResult,
        chartsResult,
        activityResult,
        hazardsResult,
        locationsResult,
        threatsResult,
        risksResult,
        integrationsResult,
      ].every(
        (result) => result.status === "rejected"
      );

      if (allDataRequestsFailed) {
        applyDashboardSnapshot(readDashboardSnapshot());

        if (healthResult.status === "rejected") {
          setLoadError(
            "Could not reach the Phoenix API gateway. Check that Docker is running and the gateway is available on localhost:3001."
          );
        }

        setIsLoading(false);
        return;
      }

      const overview =
        overviewResult.status === "fulfilled" ? overviewResult.value : {};
      const activity =
        activityResult.status === "fulfilled" ? activityResult.value : {};
      const activityThreats = Array.isArray(activity.recent_threats)
        ? activity.recent_threats
        : [];
      const charts =
        chartsResult.status === "fulfilled" ? chartsResult.value : {};
      const integrationItems =
        integrationsResult.status === "fulfilled"
          ? sortNewestFirst(integrationsResult.value.items || [])
          : [];

      const allDataRequestsFailed = [threatsResult, hazardsResult].every(
        (result) => result.status === "rejected"
      );
      const listedThreats =
        threatsResult.status === "fulfilled"
          ? threatsResult.value.items || []
          : [];
      const displayedThreats =
        activityThreats.length > 0 ? activityThreats : listedThreats;

      const hazardItems =
        hazardsResult.status === "fulfilled"
          ? hazardsResult.value.items || []
          : [];
      const locationItems =
        locationsResult.status === "fulfilled"
          ? locationsResult.value || []
          : [];
      const hazardTotalValue =
        overview.total_hazards ??
        (hazardsResult.status === "fulfilled"
          ? hazardsResult.value.total
          : hazardItems.length);
      const threatTotalValue =
        overview.total_threats ??
        (threatsResult.status === "fulfilled"
          ? threatsResult.value.total
          : displayedThreats.length);
      const riskTotalValue =
        overview.total_risks ??
        overview.total_risk_assessments ??
        (risksResult.status === "fulfilled"
          ? risksResult.value.total
          : undefined) ??
        overview.total_ingestions ??
        (integrationsResult.status === "fulfilled"
          ? integrationsResult.value.total
          : integrationItems.length);

      setThreats(displayedThreats);
      setThreatsByRiskLevel(charts.threats_by_risk_level || {});
      setIntegrations(integrationItems);
      setThreatTotal(threatTotalValue);
      setHazards(hazardItems);
      setLocations(locationItems);
      setHazardTotal(hazardTotalValue);
      setRiskTotal(riskTotalValue);

      saveDashboardSnapshot({
        totals: {
          hazards: hazardTotalValue,
          threats: threatTotalValue,
          risks: riskTotalValue,
        },
        threats: displayedThreats,
        threatsByRiskLevel: charts.threats_by_risk_level || {},
        hazards: hazardItems,
        locations: locationItems,
        integrations: integrationItems,
      });

      if (
        healthResult.status === "rejected" &&
        allDataRequestsFailed
      ) {
        setLoadError(
          "Could not reach the Phoenix API gateway. Check that Docker is running and the gateway is available on localhost:3001."
        );
      }

      setIsLoading(false);
    };

    loadDashboardData();

    return () => {
      isActive = false;
    };
  }, [isLoggedIn]);

  const overviewCards = useMemo(
    () => [
      { label: "API Status", value: apiStatus },
      { label: "Total Hazards", value: hazardTotal },
      { label: "Total Threats", value: threatTotal },
      { label: "Total Risks", value: riskTotal },
    ],
    
    [
      apiStatus,
      hazardTotal,
      riskTotal,
      threatTotal,
    ]
  );

  const itemRows = useMemo(
    () => threats.map(normalizeThreatRow),
    [threats]
  );

  const hazardRows = useMemo(
    () => hazards.map(normalizeHazardRow),
    [hazards]
  );

  const riskMapPoints = useMemo(
    () => buildRiskMapPoints(hazards, locations),
    [hazards, locations]
  );

  const riskMapGroups = useMemo(
    () => groupRiskMapPoints(riskMapPoints),
    [riskMapPoints]
  );

  const riskMapBounds = useMemo(
    () => buildMapBounds(riskMapPoints),
    [riskMapPoints]
  );

  const riskMapView = useMemo(
    () => buildTileView(riskMapBounds),
    [riskMapBounds]
  );

  const riskMapTiles = useMemo(
    () => buildMapTiles(riskMapView),
    [riskMapView]
  );

  const projectedRiskMapGroups = useMemo(
    () =>
      riskMapGroups.map((point) => {
        const position = projectToMap(
          point.latitude,
          point.longitude,
          riskMapView,
        );

        return {
          ...point,
          left: position.left,
          top: position.top,
        };
      }),
    [riskMapGroups, riskMapView]
  );

  const anomalyRows = useMemo(
    () =>
      integrations
        .filter(isAnomalyIntegration)
        .map(normalizeAnomalyIntegration)
        .slice(0, 5),
    [integrations]
  );

  const latestAnomalyResult = useMemo(
    () =>
      anomalyRows.find((item) => item.status === "completed") ||
      anomalyRows[0],
    [anomalyRows]
  );

  const chartRows = useMemo(() => {
    const rows = normalizeThreatChartRows(threatsByRiskLevel);

    if (rows.length > 0) {
      return rows;
    }

    return itemRows.map((threat) => ({
      id: threat.id,
      name: threat.name,
      severity: threat.vulnerability,
      riskValue: threat.riskValue,
    }));
  }, [itemRows, threatsByRiskLevel]);

  const hasThreatData = chartRows.length > 0;

  //Detection API call
  const pollForAnomalyResult = async (regionId, submittedAt) => {
    const submittedTime = submittedAt.getTime() - 5000;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await pause(attempt === 0 ? 1000 : 1500);

      const items = await loadIntegrations();
      const match = sortNewestFirst(items).find((integration) => {
        const input = integration.input || {};

        return (
          isAnomalyIntegration(integration) &&
          input.region_id === regionId &&
          getIntegrationTime(integration) >= submittedTime
        );
      });

      if (match?.status === "completed" || match?.status === "error") {
        return match;
      }
    }

    return null;
  };

  const runDetection = async () => {
    setDetectionError("");
    showDetectionMessage("");
    setApiResult(null);
    setLoadingDetection(true);

    let payload;

    try {
      payload = buildAnomalyPayload(
        selectedRegion,
        selectedTimestamp
      );
      const submittedAt = new Date();
      const response = await postIngestionAnomaly(payload);
      const immediateResult = normalizeAnomalyResult(
        {
          ...response,
          input: response.input || payload,
          status: response.status || "processing",
        },
        selectedRegion
      );

      setApiResult(immediateResult);

      if (
        immediateResult.status === "completed" ||
        immediateResult.status === "error" ||
        immediateResult.anomalyScore !== undefined ||
        immediateResult.riskLevel
      ) {
        showDetectionMessage("Backend anomaly output received.");
        return;
      }

      showDetectionMessage(
        immediateResult.integrationId
          ? "Anomaly request submitted to the backend. Waiting for the result..."
          : "Anomaly request submitted to the backend."
      );

      const result = await pollForAnomalyResult(
        selectedRegion.id,
        submittedAt
      );

      if (result) {
        const normalizedResult = normalizeAnomalyIntegration(result);
        setApiResult(normalizedResult);

        if (normalizedResult.status === "error") {
          setDetectionError(
            result.note || "The anomaly model returned an error."
          );
          showDetectionMessage("");
          return;
        }

        showDetectionMessage("Anomaly model output received.");
      } else {
        showDetectionMessage(
          "Anomaly request submitted. Refresh later if it is still processing."
        );
      }

    } catch (error) {
      console.error("Detection error:", error);

      if (error.code === "ANOMALY_ENDPOINT_UNAVAILABLE") {
        setDetectionError(
          "The backend does not expose /api/ingestion/anomaly yet, so the frontend cannot show live anomaly output."
        );
        showDetectionMessage("");
        return;
      }

      setDetectionError(
        error.message ||
          "Could not submit the anomaly detection request."
      );
    } finally {
      setLoadingDetection(false);
    }
  };

  const displayedDetection = apiResult || latestAnomalyResult;

  return (
    <div className="dashboard-page">
      <main className="dashboard-content">
        <div className="dashboard-main-area">

          {loadError && (
            <div
              className="backend-status-message"
              role="alert"
            >
              {loadError}
            </div>
          )}

          <section
            className="overview-grid"
            aria-label="Dashboard overview"
          >
            {overviewCards.map((card) => {
              const cardValue =
                isLoading && card.value === undefined
                  ? "..."
                  : card.value ?? "-";
              const isLongValue = String(cardValue).length > 8;

              return (
                <div
                  className="overview-card"
                  key={card.label}
                >
                  <span className="overview-label">
                    {card.label}
                  </span>

                  <strong
                    className={`overview-value ${
                      isLongValue ? "long-value" : ""
                    }`}
                  >
                    {cardValue}
                  </strong>
                </div>
              );
            })}
          </section>

          {/* Regional Anomaly Detection Section (Jack)*/}
          <section className="ai-detection-card">

            {/* Left Side Input */}
            <div className="ai-detection-input">
              <h2>Regional Anomaly Detection</h2>

              <p>
                Run the AI anomaly detection model
                against a selected Australian region.
              </p>

              <div className="anomaly-form-grid">
                <label className="anomaly-field">
                  <span>Region</span>

                  <select
                    value={selectedRegionId}
                    onChange={(event) =>
                      setSelectedRegionId(event.target.value)
                    }
                  >
                    {anomalyRegions.map((region) => (
                      <option
                        key={region.id}
                        value={region.id}
                      >
                        {region.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="anomaly-field">
                  <span>Timestamp</span>

                  <input
                    type="datetime-local"
                    value={selectedTimestamp}
                    onChange={(event) =>
                      setSelectedTimestamp(event.target.value)
                    }
                  />
                </label>
              </div>

              <button
                type="button"
                className="anomaly-run-button"
                onClick={runDetection}
                disabled={loadingDetection}
              >
                {loadingDetection
                  ? "Running Detection..."
                  : "Run Detection"}
              </button>
            </div>

            {/* Right side output */}
            <div className="ai-detection-output">
              <h3>Detection Output</h3>

              {detectionMessage && (
                <div
                  className={`detection-status-message ${detectionMessageTone}`}
                >
                  {detectionMessage}
                </div>
              )}

              {detectionError && (
                <div
                  className="detection-error-message"
                  role="alert"
                >
                  {detectionError}
                </div>
              )}

              {!displayedDetection ? (
                <p>
                  No detection has been run yet.
                </p>
              ) : (
                <>
                  <div className="detection-output-grid">
                    <div>
                      <span>Region</span>
                      <strong>
                        {displayedDetection.regionLabel ||
                          displayedDetection.regionId}
                      </strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong>
                        {formatLabel(displayedDetection.status)}
                      </strong>
                    </div>

                    <div>
                      <span>Risk Level</span>
                      <strong>
                        {displayedDetection.riskLevel || "Pending"}
                      </strong>
                    </div>

                    <div>
                      <span>Anomaly Score</span>
                      <strong>
                        {formatScore(displayedDetection.anomalyScore)}
                      </strong>
                    </div>

                    <div>
                      <span>Confidence</span>
                      <strong>
                        {formatConfidence(
                          displayedDetection.confidenceScore
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Processed</span>
                      <strong>
                        {displayedDetection.processedAt
                          ? new Date(
                              displayedDetection.processedAt
                            ).toLocaleString()
                          : "-"}
                      </strong>
                    </div>
                  </div>

                  {displayedDetection.drivers?.length > 0 && (
                    <div className="anomaly-driver-list">
                      <span>Main drivers</span>

                      {displayedDetection.drivers.map((driver) => (
                        <strong key={driver}>{driver}</strong>
                      ))}
                    </div>
                  )}

                </>
              )}
            </div>
          </section>

          {/* Risk Map Section (Jack) */}
          <section className="map-card">
            <div className="map-header">
              <h2>Risk Map</h2>
              <p>
                Hazard data is now loaded from the Phoenix backend. The map
                component can use these hazard records when it is ready.
              </p>
            </div>

            <div className="risk-map-layout">
              <div className="risk-map-canvas">
                <div className="risk-map-tile-layer" aria-hidden="true">
                  {riskMapTiles.map((tile) => (
                    <img
                      alt=""
                      key={tile.key}
                      src={tile.src}
                      style={{
                        left: `${tile.left}%`,
                        top: `${tile.top}%`,
                        width: `${tile.width}%`,
                        height: `${tile.height}%`,
                      }}
                    />
                  ))}
                </div>

                {projectedRiskMapGroups.length > 0 ? (
                  projectedRiskMapGroups.map((point) => (
                    <button
                      className={`risk-map-marker ${point.tone}`}
                      key={point.id}
                      style={{
                        left: `${point.left}%`,
                        top: `${point.top}%`,
                      }}
                      title={`${point.type} | ${point.location} | ${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`}
                      type="button"
                    >
                      <span>{point.count > 1 ? point.count : ""}</span>
                    </button>
                  ))
                ) : (
                  <div className="map-box">
                    <span>
                      {isLoading
                        ? "Loading map locations..."
                        : hazardRows.length > 0
                          ? `${hazardRows.length} hazards loaded, but none have matching coordinates yet`
                          : "No hazards returned yet"}
                    </span>
                  </div>
                )}

                <span className="risk-map-attribution">
                  Map data: OpenStreetMap
                </span>
              </div>

              <div className="risk-map-details">
                <div className="risk-map-summary-grid">
                  <div className="risk-map-summary">
                    <span>Hazards</span>
                    <strong>{hazardRows.length}</strong>
                  </div>

                  <div className="risk-map-summary">
                    <span>Shown on map</span>
                    <strong>{riskMapPoints.length}</strong>
                  </div>
                </div>

                <div className="risk-map-list">
                  {projectedRiskMapGroups.length > 0 ? (
                    projectedRiskMapGroups.map((point) => (
                      <div
                        className="risk-map-list-item"
                        key={`detail-${point.id}`}
                      >
                        <span className={`map-severity-dot ${point.tone}`}></span>

                        <div>
                          <strong>{point.type}</strong>
                          <small>{point.location}</small>
                          <small>{point.count} mapped items</small>
                        </div>

                        <span className={`map-risk-pill ${point.tone}`}>
                          {point.severity}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="map-detail-empty">
                      {isLoading
                        ? "Loading hazard locations..."
                        : hazardRows.length > 0
                          ? "Hazards loaded. Map placement is waiting for a usable location value."
                          : "No hazards returned yet."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Threat Chart Section (Sathvik) */}
          <section className="threat-chart-section">
            <div className="threat-chart-header">
              <div>
                <h2>Threat Chart</h2>

                <p>
                  Loaded from the Phoenix dashboard
                  charts endpoint.
                </p>
              </div>

              <span className="backend-ready-badge">
                {isLoading
                  ? "Loading"
                  : apiStatus}
              </span>
            </div>

            <div className="threat-chart-body">
              {hasThreatData ? (
                <div className="threat-chart-list">
                  {chartRows.map((threat) => (
                    <div
                      className={`threat-row ${barClassFor(threat.severity)}`}
                      key={threat.id}
                    >
                      <span className="threat-name">
                        {threat.name}
                      </span>

                      <div className="threat-bar-track">
                        <div
                          className={`threat-bar ${barClassFor(
                            threat.severity
                          )}`}
                          style={{
                            width: `${threat.riskValue}%`,
                          }}
                        />
                      </div>

                      <span className="threat-value">
                        {threat.count
                          ? `${threat.count}`
                          : `${threat.riskValue}%`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-chart-placeholder">
                  <div className="chart-area">
                    <div className="chart-grid-line line-1"></div>
                    <div className="chart-grid-line line-2"></div>
                    <div className="chart-grid-line line-3"></div>
                    <div className="chart-bar high-bar"></div>
                    <div className="chart-bar medium-bar"></div>
                    <div className="chart-bar low-bar"></div>
                  </div>

                  <div className="empty-chart-text">
                    <strong>
                      {isLoading
                        ? "Loading threat data"
                        : "No threat data returned yet"}
                    </strong>
                    <span>
                      The frontend is connected to
                      the backend endpoint and will
                      display records as soon as the
                      API returns them.
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="threat-chart-footer">
              <div>
                <strong>
                  Data source:
                </strong>

                <span>
                  {" "}
                  /api/users/dashboard/charts
                </span>
              </div>

              <div className="severity-legend">
                <span className="legend-dot high"></span>
                <span>High</span>

                <span className="legend-dot medium"></span>
                <span>Medium</span>

                <span className="legend-dot low"></span>
                <span>Low</span>
              </div>
            </div>
          </section>
          {/*Item List Section (Manaal)*/}
          <section className="item-list-card">
            <div className="item-list-header">
              <div className="item-list-title-block">
                <span className="item-list-kicker">Backend activity</span>
                <h2>Recent Threat Signals</h2>
                <p>
                  Latest cyber and anomaly indicators linked to hazard monitoring.
                </p>
              </div>

              <div className="item-list-actions">
                <span className="item-count-pill">
                  {itemRows.length} shown
                </span>

                <button
                  type="button"
                  className="view-all-button"
                  onClick={() =>
                    setPage("alerts")
                  }
                >
                  View All
                </button>
              </div>
            </div>

            <div className="item-list-table">
              <div className="item-list-table-head">
                <span>Signal</span>
                <span>Risk</span>
                <span>Status</span>
              </div>

              {itemRows.length > 0 ? (
                itemRows.map((item) => (
                  <div
                    className="item-list-row"
                    key={item.id}
                    onClick={() => {
                      setSelectedThreat(item);
                      setPage("threatdetails");
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        setSelectedThreat(item);
                        setPage("threatdetails");
                      }
                    }}
                  >
                    <div className="item-name-cell">
                      <span
                        className={`item-signal-dot ${item.className}`}
                        aria-hidden="true"
                      ></span>

                      <div className="item-copy">
                        <strong>{item.name}</strong>
                        <small>{item.meta}</small>
                      </div>
                    </div>

                    <div
                      className={`status-pill ${item.className}`}
                    >
                      {item.vulnerability}
                    </div>

                    <div className="status-right-cell">
                      <div
                        className={`status-pill ${item.className}`}
                      >
                        {item.status}
                      </div>

                      <span className="row-arrow">
                        &gt;
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="item-list-empty">
                  {isLoading
                    ? "Loading backend threats..."
                    : "No threat records returned yet."}
                </div>
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

export default Dashboard;