export interface NotificationEvent {
  eventId: string;
  eventType: string;
  recipientUserId: string;
  title: string;
  message: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export const NOTIFICATION_EXCHANGE = "phoenix.notifications";
export const NOTIFICATION_QUEUE = "notification-service.events";
export const NOTIFICATION_QUEUE_BINDING = "notification.#";

export const NotificationRoutingKey = {
  HAZARD_CRITICAL: "notification.hazard.critical.v1",
  CYBER_CRITICAL: "notification.cyber.critical.v1",
} as const;
