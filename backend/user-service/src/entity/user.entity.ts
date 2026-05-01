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

export class GetUserDashboardEntity {
  status: number;
  message: string;
  total_users: number;
  admin_users: number;
  standard_users: number;

  static toEntity(item: any): GetUserDashboardEntity {
    const response = new GetUserDashboardEntity();

    response.status = item.status;
    response.message = item.message;
    response.total_users = item.total_users;
    response.admin_users = item.admin_users;
    response.standard_users = item.standard_users;

    return response;
  }
}
