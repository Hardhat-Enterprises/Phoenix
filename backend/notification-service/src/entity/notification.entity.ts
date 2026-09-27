export interface NotificationEntity {
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

export interface GetHealthEntity {
  status: number;
  message: string;
}

export interface GetNotificationsEntity {
  status: number;
  message: string;
  notifications: NotificationEntity[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface GetUnreadNotificationCountEntity {
  status: number;
  message: string;
  unread_count: number;
}

export interface MarkNotificationAsReadEntity {
  status: number;
  message: string;
  notification?: NotificationEntity;
}

export interface MarkAllNotificationsAsReadEntity {
  status: number;
  message: string;
  updated_count: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  recipient: string;
  severity: string;
  event_type: string;
  created_at: string;
}

export class GetNotificationsEntity {
  status: number;
  message: string;
  notifications: NotificationItem[];
  total: number;
  page: number;
  limit: number;
}
