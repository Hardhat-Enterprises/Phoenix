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
  total_hazards: number;
  active_hazards: number;
  total_threats: number;
  active_threats: number;
  total_risk_assessments: number;
  critical_risks: number;
  last_updated: string;

  static toEntity(item: any): GetUserDashboardEntity {
    const response = new GetUserDashboardEntity();

    response.status = item.status;
    response.message = item.message;
    response.total_hazards = item.total_hazards;
    response.active_hazards = item.active_hazards;
    response.total_threats = item.total_threats;
    response.active_threats = item.active_threats;
    response.total_risk_assessments =
      item.total_risk_assessments;
    response.critical_risks = item.critical_risks;
    response.last_updated = item.last_updated;

    return response;
  }
}
