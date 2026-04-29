export class GetHealthEntity {
  status: number;
  message: string;
}

export class GetUsersEntity {
  status: number;
  message: string;
  users?: [
    {
      user_id: string;
      username: string;
      role: string;
    },
  ];
  static toEntity(item: any): GetUsersEntity {
    const response = new GetUsersEntity();
    response.users = item.users.map((user: any) => ({
      user_id: user.user_id,
      username: user.username,
      role: user.role,
    }));
    return response;
  }
}
