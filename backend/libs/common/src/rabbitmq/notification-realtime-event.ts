export interface NotificationRealtimePayload {
  id: string;
  user_id: string;
  event_id: string;
  event_type: string;
  title: string;
  message: string;
  metadata: string;
  is_read: boolean;
  read_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string;
}

export interface NotificationRealtimeEvent {
  type: "notification.created";
  notification: NotificationRealtimePayload;
}

export const NOTIFICATION_REALTIME_EXCHANGE = "phoenix.notifications.realtime";
