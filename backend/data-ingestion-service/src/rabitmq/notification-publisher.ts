import { Channel } from "amqplib";
import {
  CyberDataStreamRequest,
  HazardDataStreamRequest,
} from "@phoenix/common/rabbitmq/data-stream-payload";
import { getChannel } from "@phoenix/common/rabbitmq/connection";
import { logger } from "@phoenix/common/config/logger";
import {
  NOTIFICATION_EXCHANGE,
  NotificationEvent,
  NotificationRoutingKey,
} from "@phoenix/common/rabbitmq/notification-event";

export const CRITICAL_HAZARD_SEVERITY = 0.8;

type PublishChannel = Pick<Channel, "assertExchange" | "publish">;

const toIsoDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Notification event timestamp is invalid: ${value}`);
  }

  return date.toISOString();
};

export const isCriticalHazard = (payload: HazardDataStreamRequest): boolean =>
  Number(payload.hazard_severity) >= CRITICAL_HAZARD_SEVERITY;

export const isCriticalCyberThreat = (
  payload: CyberDataStreamRequest,
): boolean => payload.severity.toLowerCase() === "critical";

export const createHazardNotificationEvent = (
  payload: HazardDataStreamRequest,
  hazardEventId: string,
  recipientUserId: string,
): NotificationEvent => ({
  eventId: `hazard:${hazardEventId}`,
  eventType: NotificationRoutingKey.HAZARD_CRITICAL,
  recipientUserId,
  title: `Critical ${payload.hazard_type} hazard`,
  message: `A critical ${payload.hazard_type} hazard was detected in ${payload.hazard_location}.`,
  occurredAt: toIsoDateTime(payload.hazard_timestamp || payload.timestamp),
  metadata: {
    hazardEventId,
    hazardType: payload.hazard_type,
    hazardSeverity: Number(payload.hazard_severity),
    alertLevel: payload.alert_level,
    location: payload.hazard_location,
    source: payload.source,
  },
});

export const createCyberNotificationEvent = (
  payload: CyberDataStreamRequest,
  recipientUserId: string,
): NotificationEvent => ({
  eventId: `cyber:${payload.event_id}`,
  eventType: NotificationRoutingKey.CYBER_CRITICAL,
  recipientUserId,
  title: `Critical ${payload.threat_type} cyber threat`,
  message: `A critical ${payload.threat_type} cyber threat was detected by ${payload.source}.`,
  occurredAt: toIsoDateTime(payload.timestamp),
  metadata: {
    sourceEventId: payload.event_id,
    threatType: payload.threat_type,
    severity: payload.severity,
    confidenceScore: Number(payload.confidence_score),
    source: payload.source,
  },
});

export const publishNotificationEvent = async (
  event: NotificationEvent,
  routingKey: string,
  channel: PublishChannel = getChannel(),
): Promise<void> => {
  await channel.assertExchange(NOTIFICATION_EXCHANGE, "topic", {
    durable: true,
  });
  channel.publish(
    NOTIFICATION_EXCHANGE,
    routingKey,
    Buffer.from(JSON.stringify(event)),
    {
      contentType: "application/json",
      deliveryMode: 2,
      messageId: event.eventId,
      timestamp: Date.now(),
      type: event.eventType,
    },
  );
};

const getDefaultRecipient = (): string | undefined => {
  const recipientUserId = process.env.NOTIFICATION_DEFAULT_RECIPIENT_USER_ID;
  if (!recipientUserId) {
    logger.warn(
      "Critical event notification skipped: NOTIFICATION_DEFAULT_RECIPIENT_USER_ID is not configured",
    );
  }
  return recipientUserId;
};

export const publishCriticalHazardNotification = async (
  payload: HazardDataStreamRequest,
  hazardEventId: string,
): Promise<void> => {
  if (!isCriticalHazard(payload)) return;

  const recipientUserId = getDefaultRecipient();
  if (!recipientUserId) return;

  const event = createHazardNotificationEvent(
    payload,
    hazardEventId,
    recipientUserId,
  );
  await publishNotificationEvent(
    event,
    NotificationRoutingKey.HAZARD_CRITICAL,
  );
  logger.info(`Published notification event ${event.eventId}`);
};

export const publishCriticalCyberNotification = async (
  payload: CyberDataStreamRequest,
): Promise<void> => {
  if (!isCriticalCyberThreat(payload)) return;

  const recipientUserId = getDefaultRecipient();
  if (!recipientUserId) return;

  const event = createCyberNotificationEvent(payload, recipientUserId);
  await publishNotificationEvent(
    event,
    NotificationRoutingKey.CYBER_CRITICAL,
  );
  logger.info(`Published notification event ${event.eventId}`);
};
