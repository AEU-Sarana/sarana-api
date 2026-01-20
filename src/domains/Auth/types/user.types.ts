import { UserRole, UserStatus } from '../enums';

export interface User {
  userId: number;
  username: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  username?: string;
  role?: UserRole;
  status?: UserStatus;
}