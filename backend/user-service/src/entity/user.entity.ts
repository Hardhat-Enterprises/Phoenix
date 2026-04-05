export class GetHealthEntity {
  status: number;
  message: string;
}

export class GetUsersEntity {
  status: number;
  message: string;
  users?: [
    {
      id: number;
      name: string;
      email: string;
    },
  ];
}
