import { SecurityNotification } from "./notificationTypes";

export function logSecurityNotification(
  notification: SecurityNotification
): void {
  console.log("\n==============================");
  console.log(" SECURITY EVENT DETECTED");
  console.log("==============================");

  console.log(`Time      : ${notification.timestamp}`);
  console.log(`Event     : ${notification.event}`);
  console.log(`Severity  : ${notification.severity}`);
  console.log(`Message   : ${notification.message}`);
  console.log(`Endpoint  : ${notification.endpoint}`);
  console.log(`Method    : ${notification.method}`);

  if (notification.ip) {
    console.log(`IP        : ${notification.ip}`);
  }

  if (notification.userId) {
    console.log(`User ID   : ${notification.userId}`);
  }

  console.log("==============================\n");
}