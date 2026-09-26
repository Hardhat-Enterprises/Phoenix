export interface GetHealthEntity {
  status: number;
  message: string;
}

export interface UserEntity {
  user_id?: string;
  username?: string;
  role?: string;
  id?: number;
  name?: string;
  email?: string;
}

export interface GetUsersEntity {
  status: number;
  message: string;
  users?: UserEntity[];
}

export class AuthEntity {
  status: number;
  message: string;
  user_id?: string;
  username?: string;
  role?: string;
  access_token?: string;
  refresh_token?: string;
}

export class GetUserDashboardEntity {
  status: number;
  message: string;
  total_hazards: number;
  critical_hazards: number;
  total_threats: number;
  active_threats: number;
  total_ingestions: number;
  total_risk_assessments: number;
  critical_risk_assessments: number;
  last_updated: string;

  static toEntity(item: any): GetUserDashboardEntity {
    const response = new GetUserDashboardEntity();
    response.status = item.status;
    response.message = item.message;
    response.total_hazards = item.total_hazards;
    response.critical_hazards = item.critical_hazards;
    response.total_threats = item.total_threats;
    response.active_threats = item.active_threats;
    response.total_ingestions = item.total_ingestions;
    response.total_risk_assessments = item.total_risk_assessments;
    response.critical_risk_assessments = item.critical_risk_assessments;
    response.last_updated = item.last_updated;

    return response;
  }
}

export class GetUserDashboardChartsEntity {
  status: number;
  message: string;
  hazards_by_severity: string;
  threats_by_risk_level: string;
  risk_assessments_by_level: string;
  last_updated: string;
}

export class GetUserDashboardActivityEntity {
  status: number;
  message: string;
  recent_hazards: string;
  recent_threats: string;
  recent_risk_assessments: string;
  last_updated: string;
}
