export class GetHealthEntity {
  status: number;
  message: string;
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