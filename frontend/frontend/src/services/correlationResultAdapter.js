const KNOWN_BACKEND_STATUSES = new Set([
  "ok",
  "no_hazards_available",
  "invalid_input",
]);

const KNOWN_RELATIONSHIP_TYPES = new Set([
  "fake_relief_or_donation",
  "impersonates_response_agency",
  "fake_emergency_update",
  "exploits_hazard",
  "mentions_hazard",
  "unrelated",
]);

// These relationship labels can imply harmful/scam behaviour.
// Do not expose them unless phishing context has explicitly refined the result.
const PHISHING_DEPENDENT_RELATIONSHIPS = new Set([
  "fake_relief_or_donation",
  "impersonates_response_agency",
  "fake_emergency_update",
  "exploits_hazard",
]);

const asObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;

const asText = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : null;

const asCount = (value) => {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? Math.floor(number)
    : 0;
};

const asCorrelationScore = (value) => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  // The documented correlation score is expected to be between 0 and 1.
  if (number < 0 || number > 1) {
    return null;
  }

  return number;
};

const normaliseLocation = (hazard) => {
  const location = asObject(hazard?.location);

  const suburb =
    asText(location?.suburb) ||
    asText(hazard?.suburb) ||
    asText(hazard?.hazard_location);

  const state =
    asText(location?.state) ||
    asText(location?.state_region) ||
    asText(hazard?.state) ||
    asText(hazard?.state_region);

  const localGovernmentArea =
    asText(location?.local_government_area) ||
    asText(location?.lga) ||
    asText(hazard?.local_government_area);

  const displayName =
    asText(location?.display_name) ||
    asText(location?.name) ||
    [suburb, localGovernmentArea, state]
      .filter(Boolean)
      .join(", ") ||
    null;

  return {
    suburb,
    state,
    localGovernmentArea,
    displayName,
  };
};

const normaliseHazard = (value) => {
  const hazard = asObject(value);

  if (!hazard) {
    return null;
  }

  return {
    id:
      asText(hazard.hazard_id) ||
      asText(hazard.id) ||
      asText(hazard.event_id),

    type:
      asText(hazard.hazard_type) ||
      asText(hazard.type) ||
      asText(hazard.event_type),

    location: normaliseLocation(hazard),

    status:
      asText(hazard.status) ||
      asText(hazard.hazard_status),

    severity:
      asText(hazard.severity) ||
      asText(hazard.hazard_severity),

    startTime:
      asText(hazard.start_time) ||
      asText(hazard.hazard_timestamp),
  };
};

const normaliseRelationshipType = (
  value,
  { phishingRefined = false } = {},
) => {
  const relationshipType = asText(value)?.toLowerCase();

  if (!relationshipType) {
    return "unknown";
  }

  if (!KNOWN_RELATIONSHIP_TYPES.has(relationshipType)) {
    return "unknown";
  }

  // Correlation alone does not determine maliciousness.
  // Until phishing context has refined the result, use the neutral
  // hazard-linkage label instead of a scam-like relationship label.
  if (
    PHISHING_DEPENDENT_RELATIONSHIPS.has(relationshipType) &&
    !phishingRefined
  ) {
    return "mentions_hazard";
  }

  return relationshipType;
};

const unavailableResult = (
  detail,
  source = "unknown",
) => ({
  presentationState: "unavailable",
  status: "unavailable",

  statusDetail:
    detail ||
    "Correlation information is currently unavailable.",

  isHazardRelated: null,
  relationshipType: "unknown",
  hazard: null,
  matchCount: 0,

  // This remains a rule score. It is never confidence.
  correlationScore: null,

  modelVersion: null,
  source,
});

export const adaptCorrelationResult = (
  result,
  options = {},
) => {
  const source =
    options.source === "live"
      ? "live"
      : "demonstration";

  const payload = asObject(result);

  if (!payload) {
    return unavailableResult(
      "Correlation information could not be read from the supplied result.",
      source,
    );
  }

  const status = asText(payload.status)?.toLowerCase();

  if (!status) {
    return unavailableResult(
      "The correlation result is missing its status.",
      source,
    );
  }

  // Frontend-only states may be supplied by an integrating layer
  // even though they are not normal backend result statuses.
  if (!KNOWN_BACKEND_STATUSES.has(status)) {
    if (status === "processing") {
      return {
        ...unavailableResult(
          asText(payload.status_detail) ||
            "Correlation analysis is still processing.",
          source,
        ),
        presentationState: "processing",
        status: "processing",
        modelVersion: asText(payload.model_version),
      };
    }

    if (status === "unavailable") {
      return unavailableResult(
        asText(payload.status_detail) ||
          "Correlation information is currently unavailable.",
        source,
      );
    }

    return unavailableResult(
      "The correlation result contains an unsupported status.",
      source,
    );
  }

  if (status === "no_hazards_available") {
    return {
      ...unavailableResult(
        asText(payload.status_detail) ||
          "No active hazards were available for comparison, so the result is inconclusive.",
        source,
      ),

      presentationState: "inconclusive",
      status,

      modelVersion: asText(payload.model_version),
    };
  }

  if (status === "invalid_input") {
    return {
      ...unavailableResult(
        asText(payload.status_detail) ||
          "The supplied content could not be analysed. Check that usable text or a URL was provided and try again.",
        source,
      ),

      presentationState: "invalid",
      status,

      modelVersion: asText(payload.model_version),
    };
  }

  const hazard =
    normaliseHazard(payload.hazard) ||
    normaliseHazard(payload.matched_hazard) ||
    normaliseHazard(payload.primary_hazard);

  const isHazardRelated =
    typeof payload.is_hazard_related === "boolean"
      ? payload.is_hazard_related
      : null;

  if (isHazardRelated === null) {
    return unavailableResult(
      "The correlation result is missing the hazard-relationship decision.",
      source,
    );
  }

  const correlationScore = asCorrelationScore(
    payload.correlation_probability,
  );

  const phishingRefined =
    options.phishingRefined === true ||
    payload.relationship_refined_by_phishing === true ||
    payload.phishing_context_applied === true;

  const relationshipType =
    normaliseRelationshipType(
      payload.relationship_type,
      { phishingRefined },
    );

  return {
    presentationState: isHazardRelated
      ? "related"
      : "unrelated",

    status,

    statusDetail:
      asText(payload.status_detail) ||
      (isHazardRelated
        ? "The supplied content was linked to an active hazard."
        : "No active hazard relationship was identified."),

    isHazardRelated,

    relationshipType,

    hazard,

    matchCount: asCount(payload.match_count),

    correlationScore,

    modelVersion: asText(payload.model_version),

    source,
  };
};

const parseMetadata = (metadata) => {
  if (asObject(metadata)) {
    return metadata;
  }

  if (
    typeof metadata === "string" &&
    metadata.trim()
  ) {
    try {
      const parsed = JSON.parse(metadata);

      return asObject(parsed);
    } catch {
      return null;
    }
  }

  return null;
};

export const adaptNotificationCorrelation = (
  metadata,
) => {
  const safeMetadata = parseMetadata(metadata);

  if (!safeMetadata) {
    return unavailableResult(
      "No usable correlation information is available for this notification.",
      "notification",
    );
  }

  const embeddedResult =
    asObject(safeMetadata.correlation_result) ||
    asObject(safeMetadata.correlation) ||
    asObject(safeMetadata.correlationResult);

  if (!embeddedResult) {
    return unavailableResult(
      "No correlation information is available for this notification.",
      "notification",
    );
  }

  try {
    return adaptCorrelationResult(
      embeddedResult,
      {
        source: "live",

        phishingRefined:
          safeMetadata.relationship_refined_by_phishing === true ||
          safeMetadata.phishing_context_applied === true,
      },
    );
  } catch {
    return unavailableResult(
      "The notification correlation information could not be displayed.",
      "notification",
    );
  }
};