import type {
  SecurityNotification,
  SecurityEvent,
  Severity,
} from "../notifications/notificationTypes";

export type AnalyticsAlertType =
  | "REPEATED_AUTH_FAILURE"
  | "REPEATED_RBAC_VIOLATION"
  | "RATE_LIMIT_ABUSE";

export interface AnalyticsAlert {
  alertType: AnalyticsAlertType;
  severity: Severity;
  message: string;
  eventCount: number;
  detectedAt: string;
  userId?: string;
  ip?: string;
}

export interface AnalyticsResult {
  suspicious: boolean;
  alerts: AnalyticsAlert[];
  event: SecurityNotification;
}