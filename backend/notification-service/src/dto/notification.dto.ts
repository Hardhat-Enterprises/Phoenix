export class GetHealthDto {}

export interface GetNotificationsDto {
  user_id: string;
  page: number;
  limit: number;
  has_is_read: boolean;
  is_read: boolean;
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
