import { doesNotMatch } from "assert";

export class GetHealthDto {}

export class GetUsersDto {}

export class GetAdminUsersDto {
  access_token: string;
}

export class DisableAccountDto {
  user_id: string;
  access_token: string;
}

export class GetUserDashboardDto {}

export class GetUserDashboardChartsDto {}

export class GetUserDashboardActivityDto {}

export class RegisterUserDto {
  username: string;
  password: string;
  role?: string;
}

export class CreateAdminDto {
  username: string;
  password: string;
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