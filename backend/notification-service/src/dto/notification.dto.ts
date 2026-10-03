export class GetHealthDto { }

export interface GetNotificationsDto {
  user_id: string;
  page: number;
  limit: number;
  has_is_read: boolean;
  is_read: boolean;
  keyword: string;
  severity: string;
  event_type: string;
  date_from: string;
  date_to: string;
}

export interface GetUnreadNotificationCountDto {
  user_id: string;
}

export interface MarkNotificationAsReadDto {
  notification_id: string;
  user_id: string;
}

export interface MarkAllNotificationsAsReadDto {
  user_id: string;
}

export interface DeleteNotificationDto {
  notification_id: string;
  user_id: string;
}
