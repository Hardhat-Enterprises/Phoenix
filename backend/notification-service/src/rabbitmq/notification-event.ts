export interface NotificationEvent {
  eventId: string;
  eventType: string;
  recipientUserId: string;
  title: string;
  message: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export const parseNotificationEvent = (content: Buffer): NotificationEvent => {
  let value: unknown;

  try {
    value = JSON.parse(content.toString("utf8"));
  } catch {
    throw new Error("Notification event must contain valid JSON");
  }

  if (!isRecord(value)) {
    throw new Error("Notification event must be a JSON object");
  }

  const requiredStringFields = [
    "eventId",
    "eventType",
    "recipientUserId",
    "title",
    "message",
    "occurredAt",
  ] as const;

  for (const field of requiredStringFields) {
    if (!isNonEmptyString(value[field])) {
      throw new Error(`Notification event field '${field}' is required`);
    }
  }

  if (
    !ISO_DATE_TIME_PATTERN.test(value.occurredAt as string) ||
    Number.isNaN(Date.parse(value.occurredAt as string))
  ) {
    throw new Error("Notification event field 'occurredAt' must be an ISO date-time");
  }

  if (value.metadata !== undefined && !isRecord(value.metadata)) {
    throw new Error("Notification event field 'metadata' must be an object");
  }

  return value as unknown as NotificationEvent;
};
