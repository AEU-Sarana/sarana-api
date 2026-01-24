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

export interface CurrentUser {
  user_id: number;
  username: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  phone: string | null;
  status: UserStatus;
  device_id: string | null;
  is_device_bound: boolean; 
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