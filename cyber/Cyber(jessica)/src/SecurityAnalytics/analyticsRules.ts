import type {
  SecurityNotification,
} from "../notifications/notificationTypes";

import type {
  AnalyticsAlert,
} from "./analyticsTypes";

interface EventHistory {
  event: SecurityNotification;
  timestamp: number;
}

const WINDOW_MS = 5 * 60 * 1000;

const AUTH_FAILURE_THRESHOLD = 5;
const RBAC_VIOLATION_THRESHOLD = 3;
const RATE_LIMIT_THRESHOLD = 3;

function countRecentEvents(
  history: EventHistory[],
  eventType: SecurityNotification["event"],
  currentEvent: SecurityNotification,
  identifier: "ip" | "userId"
): number {
  const now = Date.now();

  return history.filter((item) => {
    const matchesEvent = item.event.event === eventType;

    const matchesIdentifier =
      identifier === "ip"
        ? item.event.ip === currentEvent.ip
        : item.event.userId === currentEvent.userId;

    return (
      matchesEvent &&
      matchesIdentifier &&
      now - item.timestamp <= WINDOW_MS
    );
  }).length + 1;
}

export function detectRepeatedAuthFailures(
  history: EventHistory[],
  event: SecurityNotification
): AnalyticsAlert | null {
  if (
    event.event !== "INVALID_JWT" &&
    event.event !== "UNAUTHORIZED_ACCESS"
  ) {
    return null;
  }

  const identifier = event.ip ? "ip" : "userId";

  const count = countRecentEvents(
    history,
    event.event,
    event,
    identifier
  );

  if (count < AUTH_FAILURE_THRESHOLD) {
    return null;
  }

  return {
    alertType: "REPEATED_AUTH_FAILURE",
    severity: "HIGH",
    message:
      "Repeated authentication failures detected within a short period.",
    eventCount: count,
    detectedAt: new Date().toISOString(),
    userId: event.userId,
    ip: event.ip,
  };
}

export function detectRepeatedRBACViolations(
  history: EventHistory[],
  event: SecurityNotification
): AnalyticsAlert | null {
  if (event.event !== "FORBIDDEN_ACCESS") {
    return null;
  }

  const identifier = event.userId ? "userId" : "ip";

  const count = countRecentEvents(
    history,
    "FORBIDDEN_ACCESS",
    event,
    identifier
  );

  if (count < RBAC_VIOLATION_THRESHOLD) {
    return null;
  }

  return {
    alertType: "REPEATED_RBAC_VIOLATION",
    severity: "HIGH",
    message:
      "Repeated RBAC violations detected for the same user or source.",
    eventCount: count,
    detectedAt: new Date().toISOString(),
    userId: event.userId,
    ip: event.ip,
  };
}

export function detectRateLimitAbuse(
  history: EventHistory[],
  event: SecurityNotification
): AnalyticsAlert | null {
  if (event.event !== "RATE_LIMIT_EXCEEDED") {
    return null;
  }

  const identifier = event.ip ? "ip" : "userId";

  const count = countRecentEvents(
    history,
    "RATE_LIMIT_EXCEEDED",
    event,
    identifier
  );

  if (count < RATE_LIMIT_THRESHOLD) {
    return null;
  }

  return {
    alertType: "RATE_LIMIT_ABUSE",
    severity: "HIGH",
    message:
      "Repeated rate-limit violations indicate possible request abuse.",
    eventCount: count,
    detectedAt: new Date().toISOString(),
    userId: event.userId,
    ip: event.ip,
  };
}