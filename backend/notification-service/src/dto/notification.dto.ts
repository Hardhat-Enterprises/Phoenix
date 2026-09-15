export class GetHealthDto {}

export class GetNotificationsDto {}

/**
 * Input for CreateNotification. This is the final, combined output of the
 * Response Decision Manager (backend/libs/common/src/helper/response-decision.ts),
 * i.e. one rule-engine result and one ADCRS result already merged into a
 * single decision - not a raw threat event.
 */
export class CreateNotificationDto {
  event_id: string;
  threat_type: string;
  severity: string;
  risk_score: number;
  confidence_score: number;
  recommended_action: string;
  notification_required: boolean;
  status: string;
  recipient?: string;
}
