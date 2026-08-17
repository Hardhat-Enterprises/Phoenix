export class GetHealthDto {}

export class GetUsersDto {}

export class GetUserDashboardDto {}

export class GetUserDashboardChartsDto {}

export class GetUserDashboardActivityDto {}

export class RegisterUserDto {
  username: string;
  password: string;
  role?: string;
}

export class LoginUserDto {
  username: string;
  password: string;
}

export class RefreshTokenDto {
  refresh_token: string;
}

export class LogoutUserDto {
  user_id: string;
}