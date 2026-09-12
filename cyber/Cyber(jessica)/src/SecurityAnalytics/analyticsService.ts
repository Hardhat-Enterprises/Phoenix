import type {
  SecurityNotification,
} from "../notifications/notificationTypes";

import type {
  AnalyticsResult,
} from "./analyticsTypes";

import {
  detectRepeatedAuthFailures,
  detectRepeatedRBACViolations,
  detectRateLimitAbuse,
} from "./analyticsRules";

interface EventHistory {
  event: SecurityNotification;
  timestamp: number;
}

const eventHistory: EventHistory[] = [];

const MAX_HISTORY_SIZE = 1000;

function cleanupHistory(): void {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

  while (
    eventHistory.length > 0 &&
    eventHistory[0].timestamp < fiveMinutesAgo
  ) {
    eventHistory.shift();
  }

  if (eventHistory.length > MAX_HISTORY_SIZE) {
    eventHistory.splice(
      0,
      eventHistory.length - MAX_HISTORY_SIZE
    );
  }
}

export function analyseSecurityEvent(
  event: SecurityNotification
): AnalyticsResult {
  cleanupHistory();

  const alerts = [];

  const authAlert = detectRepeatedAuthFailures(
    eventHistory,
    event
  );

  if (authAlert) {
    alerts.push(authAlert);
  }

  const rbacAlert = detectRepeatedRBACViolations(
    eventHistory,
    event
  );

  if (rbacAlert) {
    alerts.push(rbacAlert);
  }

  const rateLimitAlert = detectRateLimitAbuse(
    eventHistory,
    event
  );

  if (rateLimitAlert) {
    alerts.push(rateLimitAlert);
  }

  eventHistory.push({
    event,
    timestamp: Date.now(),
  });

  cleanupHistory();

  return {
    suspicious: alerts.length > 0,
    alerts,
    event,
  };
}