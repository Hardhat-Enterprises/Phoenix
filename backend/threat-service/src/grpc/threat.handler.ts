const threats: any[] = [];

const validSeverities = ["low", "medium", "high", "critical"];

const validateThreat = (threat: any): string | null => {
  if (!threat.event_id) return "event_id is required";
  if (!threat.timestamp) return "timestamp is required";
  if (!threat.event_type) return "event_type is required";
  if (!threat.source) return "source is required";
  if (!threat.threat_type) return "threat_type is required";
  if (!threat.severity) return "severity is required";

  if (threat.event_type !== "cyber") {
    return "event_type must be cyber";
  }

  if (!validSeverities.includes(threat.severity.toLowerCase())) {
    return "severity must be low, medium, high, or critical";
  }

  if (threat.confidence_score < 0 || threat.confidence_score > 1) {
    return "confidence_score must be between 0 and 1";
  }

  return null;
};

const getResponseAction = (severity: string): string => {
  const normalizedSeverity = severity.toLowerCase();

  if (normalizedSeverity === "critical") return "urgent_response";
  if (normalizedSeverity === "high") return "investigate";
  if (normalizedSeverity === "medium") return "monitor_closely";

  return "monitor";
};

export const threatHandlers = {
  GetThreatHealth: (_: any, callback: any) => {
    return callback(null, {
      status: 200,
      message: "Threat service is running",
    });
  },

  GetThreats: (_: any, callback: any) => {
    return callback(null, {
      status: 200,
      message: "Threats fetched successfully",
      threats,
    });
  },

  GetThreatStats: (_: any, callback: any) => {
    const stats = {
      total_threats: threats.length,
      critical: threats.filter((t) => t.severity === "critical").length,
      high: threats.filter((t) => t.severity === "high").length,
      medium: threats.filter((t) => t.severity === "medium").length,
      low: threats.filter((t) => t.severity === "low").length,
    };

    return callback(null, {
      status: 200,
      message: "Threat statistics fetched successfully",
      ...stats,
    });
  },

  IngestThreat: (call: any, callback: any) => {
    const threat = call.request;

    const validationError = validateThreat(threat);

    if (validationError) {
      return callback(null, {
        status: 400,
        message: validationError,
      });
    }

    const existingThreat = threats.find(
      (storedThreat) => storedThreat.event_id === threat.event_id
    );

    if (existingThreat) {
      return callback(null, {
        status: 409,
        message: "Duplicate event_id detected",
      });
    }

    const processedThreat = {
      event_id: threat.event_id,
      timestamp: threat.timestamp,
      event_type: threat.event_type,
      source: threat.source,
      threat_type: threat.threat_type,
      severity: threat.severity,
      confidence_score: threat.confidence_score,
      response_action: getResponseAction(threat.severity),
      processed_at: new Date().toISOString(),
    };

    threats.push(processedThreat);

    console.log("Threat received and processed:", processedThreat);

    return callback(null, {
      status: 201,
      message: "Threat ingested successfully",
    });
  },
};
