import {
  SecurityNotification,
  SecurityEvent,
  Severity,
} from "./notificationTypes";

import { logSecurityNotification } from "./notificationLogger";

import {
  analyseSecurityEvent,
} from "../securityAnalytics/analyticsService";

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

  // Existing security event logging
  logSecurityNotification(notification);

  // Analyse the security event
  const analysis = analyseSecurityEvent(notification);

  if (analysis.suspicious) {
    console.log("\n==============================");
    console.log(" SECURITY ANALYTICS ALERT");
    console.log("==============================");

    for (const alert of analysis.alerts) {
      console.log(`Alert     : ${alert.alertType}`);
      console.log(`Severity  : ${alert.severity}`);
      console.log(`Message   : ${alert.message}`);
      console.log(`Count     : ${alert.eventCount}`);

      if (alert.ip) {
        console.log(`IP        : ${alert.ip}`);
      }

      if (alert.userId) {
        console.log(`User ID   : ${alert.userId}`);
      }
    }

    console.log("==============================\n");
  }
}