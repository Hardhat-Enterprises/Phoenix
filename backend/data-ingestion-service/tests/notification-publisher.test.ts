import assert from "node:assert/strict";
import test from "node:test";
import { Channel } from "amqplib";
import {
  createCyberNotificationEvent,
  createHazardNotificationEvent,
  isCriticalCyberThreat,
  isCriticalHazard,
  publishNotificationEvent,
} from "../src/rabitmq/notification-publisher";
import {
  CyberDataStreamRequest,
  HazardDataStreamRequest,
} from "@phoenix/common/rabbitmq/data-stream-payload";
import {
  NOTIFICATION_EXCHANGE,
  NotificationRoutingKey,
} from "@phoenix/common/rabbitmq/notification-event";

const hazardPayload: HazardDataStreamRequest = {
  url: "https://example.com/hazard",
  text: "Critical flood warning",
  timestamp: "2026-08-12T01:00:00.000Z",
  hazard_type: "flood",
  hazard_severity: 0.8,
  hazard_timestamp: "2026-08-12T00:30:00.000Z",
  hazard_location: "Victoria",
  hazard_status: "active",
  alert_level: "critical",
  source: "test-source",
};

const cyberPayload: CyberDataStreamRequest = {
  event_id: "source-event-1",
  timestamp: "2026-08-12T02:00:00.000Z",
  event_type: "cyber",
  source: "test-source",
  threat_type: "phishing",
  severity: "critical",
  confidence_score: 0.95,
  details: "Critical phishing campaign",
};

test("publishes hazards only at the established critical threshold", () => {
  assert.equal(isCriticalHazard(hazardPayload), true);
  assert.equal(
    isCriticalHazard({ ...hazardPayload, hazard_severity: 0.79 }),
    false,
  );
});

test("publishes cyber threats only when severity is critical", () => {
  assert.equal(isCriticalCyberThreat(cyberPayload), true);
  assert.equal(
    isCriticalCyberThreat({ ...cyberPayload, severity: "high" }),
    false,
  );
});

test("maps a critical hazard to the shared notification payload", () => {
  const event = createHazardNotificationEvent(
    hazardPayload,
    "hazard-1",
    "user-1",
  );

  assert.equal(event.eventId, "hazard:hazard-1");
  assert.equal(event.eventType, NotificationRoutingKey.HAZARD_CRITICAL);
  assert.equal(event.recipientUserId, "user-1");
  assert.equal(event.occurredAt, "2026-08-12T00:30:00.000Z");
  assert.deepEqual(event.metadata, {
    hazardEventId: "hazard-1",
    hazardType: "flood",
    hazardSeverity: 0.8,
    alertLevel: "critical",
    location: "Victoria",
    source: "test-source",
  });
});

test("maps a critical cyber threat to the shared notification payload", () => {
  const event = createCyberNotificationEvent(cyberPayload, "user-1");

  assert.equal(event.eventId, "cyber:source-event-1");
  assert.equal(event.eventType, NotificationRoutingKey.CYBER_CRITICAL);
  assert.equal(event.recipientUserId, "user-1");
  assert.equal(event.occurredAt, "2026-08-12T02:00:00.000Z");
  assert.deepEqual(event.metadata, {
    sourceEventId: "source-event-1",
    threatType: "phishing",
    severity: "critical",
    confidenceScore: 0.95,
    source: "test-source",
  });
});

test("publishes a persistent JSON event to the agreed topic exchange", async () => {
  const calls: {
    exchange?: string;
    routingKey?: string;
    event?: unknown;
    options?: Record<string, unknown>;
  } = {};
  const channel = {
    assertExchange: async (exchange: string, type: string, options: unknown) => {
      assert.equal(exchange, NOTIFICATION_EXCHANGE);
      assert.equal(type, "topic");
      assert.deepEqual(options, { durable: true });
      return { exchange };
    },
    publish: (
      exchange: string,
      routingKey: string,
      content: Buffer,
      options: Record<string, unknown>,
    ) => {
      calls.exchange = exchange;
      calls.routingKey = routingKey;
      calls.event = JSON.parse(content.toString("utf8"));
      calls.options = options;
      return true;
    },
  } as unknown as Pick<Channel, "assertExchange" | "publish">;
  const event = createCyberNotificationEvent(cyberPayload, "user-1");

  await publishNotificationEvent(
    event,
    NotificationRoutingKey.CYBER_CRITICAL,
    channel,
  );

  assert.equal(calls.exchange, NOTIFICATION_EXCHANGE);
  assert.equal(calls.routingKey, NotificationRoutingKey.CYBER_CRITICAL);
  assert.deepEqual(calls.event, event);
  assert.equal(calls.options?.contentType, "application/json");
  assert.equal(calls.options?.deliveryMode, 2);
  assert.equal(calls.options?.messageId, event.eventId);
});

test("rejects an invalid source timestamp before publishing", () => {
  assert.throws(
    () =>
      createCyberNotificationEvent(
        { ...cyberPayload, timestamp: "not-a-date" },
        "user-1",
      ),
    /timestamp is invalid/,
  );
});
