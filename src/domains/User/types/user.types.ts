import { UserRole, UserStatus } from '../enums';

// Request Types
export interface ListUsersRequest {
  page?: number;
  limit?: number;
  role?: UserRole | string;
  status?: UserStatus | string;
  search?: string;
}

export interface GetUserRequest {
  userId: number;
}

export interface CreateUserRequest {
  username: string;
  email?: string;
  full_name: string; // Changed to snake_case
  password: string;
  phone?: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  full_name?: string; // Changed to snake_case
  email?: string;
  phone?: string;
  status?: UserStatus;
}

export interface DeactivateUserRequest {
  userId: number;
}

// Response Types (snake_case for API)
export interface UserResponse {
  user_id: number;
  username: string;
  email?: string | null;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  status: UserStatus;
  device_id?: string | null;
  is_device_bound: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserDetailResponse extends UserResponse {
  created_by?: number | null;
  updated_by?: number | null;
  deactivated_date?: Date | null;
}

export interface ListUsersResponse {
  users: UserResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetUserResponse extends UserDetailResponse {}

export interface CreateUserResponse extends UserResponse {
  created_by?: number | null;
}

export interface UpdateUserResponse {
  user_id: number;
  username: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  status: UserStatus;
  updated_by?: number | null;
  updated_at: Date;
}

export interface DeactivateUserResponse {
  user_id: number;
  status: UserStatus;
  deactivated_date: Date | null;
  deactivated_by: number;
}