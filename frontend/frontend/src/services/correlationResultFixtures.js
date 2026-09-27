const freeze = (value) => Object.freeze(value);

export const CORRELATION_FIXTURES = freeze({
  related: freeze({
    status: "ok",
    is_hazard_related: true,
    relationship_type: "mentions_hazard",
    correlation_probability: 0.82,
    match_count: 1,
    model_version: "correlation-rules-v1",
    hazard: freeze({
      hazard_id: "HZ-001",
      hazard_type: "Bushfire",
      location: freeze({
        suburb: "Ballarat",
        state: "Victoria",
      }),
    }),
  }),

  unrelated: freeze({
    status: "ok",
    is_hazard_related: false,
    relationship_type: "unrelated",
    correlation_probability: 0.14,
    match_count: 0,
    model_version: "correlation-rules-v1",
  }),

  inconclusive: freeze({
    status: "no_hazards_available",
    is_hazard_related: false,
    status_detail:
      "No active hazards were available for comparison.",
    match_count: 0,
    model_version: "correlation-rules-v1",
  }),

  invalid: freeze({
    status: "invalid_input",
    status_detail:
      "The supplied content does not contain enough usable text for correlation.",
    model_version: "correlation-rules-v1",
  }),

  processing: freeze({
    status: "processing",
    status_detail:
      "Correlation analysis is still processing.",
  }),

  unavailable: freeze({
    status: "unavailable",
    status_detail:
      "Correlation information is currently unavailable.",
  }),

  malformed: freeze({
    unexpected_field: "unexpected-value",
  }),

  multipleMatches: freeze({
    status: "ok",
    is_hazard_related: true,
    relationship_type: "mentions_hazard",
    correlation_probability: 0.76,
    match_count: 3,
    model_version: "correlation-rules-v1",
    hazard: freeze({
      hazard_id: "HZ-002",
      hazard_type: "Flood",
      location: freeze({
        suburb: "Richmond",
        state: "Victoria",
      }),
    }),
  }),

  missingLocation: freeze({
    status: "ok",
    is_hazard_related: true,
    relationship_type: "mentions_hazard",
    correlation_probability: 0.68,
    match_count: 1,
    model_version: "correlation-rules-v1",
    hazard: freeze({
      hazard_id: "HZ-003",
      hazard_type: "Storm",
    }),
  }),

  unknownRelationship: freeze({
    status: "ok",
    is_hazard_related: true,
    relationship_type: "future_backend_relationship",
    correlation_probability: 0.61,
    match_count: 1,
    model_version: "correlation-rules-v1",
    hazard: freeze({
      hazard_id: "HZ-004",
      hazard_type: "Flood",
      location: freeze({
        suburb: "Geelong",
        state: "Victoria",
      }),
    }),
  }),

  phishingRefined: freeze({
    status: "ok",
    is_hazard_related: true,
    relationship_type: "fake_relief_or_donation",
    relationship_refined_by_phishing: true,
    correlation_probability: 0.88,
    match_count: 1,
    model_version: "correlation-rules-v1",
    hazard: freeze({
      hazard_id: "HZ-005",
      hazard_type: "Bushfire",
      location: freeze({
        suburb: "Bendigo",
        state: "Victoria",
      }),
    }),
  }),

  unrefinedPhishingRelationship: freeze({
    status: "ok",
    is_hazard_related: true,
    relationship_type: "fake_relief_or_donation",
    relationship_refined_by_phishing: false,
    correlation_probability: 0.79,
    match_count: 1,
    model_version: "correlation-rules-v1",
    hazard: freeze({
      hazard_id: "HZ-006",
      hazard_type: "Flood",
      location: freeze({
        suburb: "Shepparton",
        state: "Victoria",
      }),
    }),
  }),
});