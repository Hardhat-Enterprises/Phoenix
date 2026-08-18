
//Model returned to callers, mapped from the raw Postgres row by the repository implementation.
export interface Notification {
  id: string;
  userId: string;
  eventId: string;
  eventType: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

//Input to NotificationRepository.create(). Mirrors the table columns the caller is allowed to set. Field names here must match what Member 1's RabbitMQ consumer sends.
export interface CreateNotificationData {
  eventId: string;
  userId: string;
  eventType: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

//Input to NotificationRepository.findByUserId(). Controls ordering and unread filtering.
export interface NotificationQueryOptions {
  //Max rows to return
  limit: number;
  //Cursor for ordering: the `createdAt` value of the last notification the caller already has. Returns rows older than this.
  cursor?: string;
  //If true, only return notifications where isRead === false.
  unreadOnly?: boolean;
}

