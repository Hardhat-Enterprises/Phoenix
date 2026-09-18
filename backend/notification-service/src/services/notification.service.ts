import { HttpStatusCode, logger } from "@phoenix/common";
import { GetHealthDto, GetNotificationsDto, CreateNotificationDto } from "../dto/notification.dto";
import { GetHealthEntity, GetNotificationsEntity, CreateNotificationEntity } from "../entity/notification.entity";

export const getHealth = (getHealthDto: GetHealthDto): GetHealthEntity => {
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Notification service is running",
  };
};

export const getNotifications = (getNotificationsDto: GetNotificationsDto): GetNotificationsEntity => {
  logger.info("Fetching notifications from database...");
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Notifications fetched successfully",
  };
};

// In-memory sequence for this stub implementation. There is no notification
// table in the database yet (see backend/database/01_schema.sql) - this
// mirrors the existing getNotifications stub above, which also does not
// touch a real database despite its log line.
let notificationIdSequence = 1;

/**
 * Consumes the final, combined output of the Response Decision Manager
 * (backend/libs/common/src/helper/response-decision.ts) and creates a
 * notification when it decided one is required. This is the Output Layer
 * of the Threat Analysis Integration pipeline shown in the team's Workflow
 * and Sequence Diagrams: rule engine + ADCRS -> Response Decision Manager
 * -> Notification (this function).
 *
 * This does not send anything over email/SMS/etc - like the rest of this
 * stub service, it constructs and returns the notification record. Wiring
 * an actual delivery channel is separate follow-up work.
 */
export const createNotification = (createNotificationDto: CreateNotificationDto): CreateNotificationEntity => {
  const {
    event_id,
    threat_type,
    severity,
    risk_score,
    recommended_action,
    notification_required,
    recipient,
  } = createNotificationDto;

  if (!notification_required) {
    logger.info(
      `Notification skipped for event ${event_id}: severity "${severity}" does not require notification`,
    );
    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: `No notification required for event ${event_id} (severity: ${severity})`,
    };
  }

  const notification = {
    id: notificationIdSequence++,
    title: `[${severity.toUpperCase()}] ${threat_type} detected`,
    body: `Event ${event_id} classified as ${severity} (risk score ${risk_score}). Recommended action: ${recommended_action}`,
    recipient: recipient || "security-team@phoenix.local",
    severity,
    sent: true,
  };

  logger.info(`Notification created for event ${event_id}: "${notification.title}"`);

  return {
    status: HttpStatusCode.HTTP_STATUS_CREATED,
    message: "Notification created successfully",
    notification,
  };
};
