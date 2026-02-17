import { UserRole } from '../enums';

// Request Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ChangePINRequest {
  current_pin: string;
  new_pin: string;
}

export interface ResetPasswordRequest {
  user_id: number;
  new_password: string;
}

export interface ResetPINRequest {
  user_id: number;
  new_pin: string;
}

// Response Types
export interface LoginResponse {
  token: string;
  user: {
    user_id: number;
    username: string;
    full_name: string;
    role: string;
    status: string;
  };
  expires_at: string | null;
}

export interface RefreshTokenResponse {
  token: string;
  expires_at: string | null;
}

// Token Payload Types
export interface UserPayload {
  userId: number;
  username: string;
  role: UserRole;
  tenantId: number;
}

export interface TokenPayload extends UserPayload {
  iat: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: number;
  tokenType: 'refresh';
  iat: number;
  exp?: number;
}

// Jobs
export interface SendPasswordResetEmailJobPayload {
  toEmail: string;
  username: string;
  fullName?: string | null;
  otpCode: string;
}
