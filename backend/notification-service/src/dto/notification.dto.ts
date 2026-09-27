export class GetHealthDto { }

export class GetNotificationsDto {
  keyword?: string;
  severity?: string;
  event_type?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}
