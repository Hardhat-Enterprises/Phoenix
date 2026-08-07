import {
  SecurityNotification,
  SecurityEvent,
  Severity,
} from "./notificationTypes";

import { logSecurityNotification } from "./notificationLogger";

export function sendSecurityNotification(
  event: SecurityEvent,
  severity: Severity,
  message: string,
  endpoint: string,
  method: string,
  ip?: string,
  userId?: string
): void {
  const notification: SecurityNotification = {
    event,
    severity,
    message,
    endpoint,
    method,
    timestamp: new Date().toISOString(),
    ip,
    userId,
  };

  logSecurityNotification(notification);
}