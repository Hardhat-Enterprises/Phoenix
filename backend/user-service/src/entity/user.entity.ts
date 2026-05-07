export interface GetHealthEntity {
  status: number;
  message: string;
}

export interface UserEntity {
  id: number;
  name: string;
  email: string;
}

export interface GetUsersEntity {
  status: number;
  message: string;
  users: UserEntity[];
}