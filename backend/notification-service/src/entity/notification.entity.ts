export class GetHealthEntity {
  status: number;
  message: string;
}

export class GetNotificationsEntity {
  status: number;
  message: string;
  notifications?: [
    {
      id: number;
      title: string;
      body: string;
      recipient: string;
    },
  ];
}
