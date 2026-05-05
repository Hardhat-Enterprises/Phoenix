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

export class GetHazardResponse {status: number;
  message: string;
  hazards: [
    {
      id: string;
      type: string;
      description: string;
    },
  ];
}