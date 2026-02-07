export interface LoginRequest {
  username: string;
  password: string;
  device_id?: string;
}

export interface LoginResponse {
  token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in_seconds: number;
  idle_expires_at: string;
  absolute_expires_at: string;
  user: {
    user_id: number;
    username: string;
    role: 'ADMIN' | 'SELLER';
  };
}

export interface RefreshRequest {
  refresh_token: string;
  device_id?: string;
}

export interface RefreshResponse {
  token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in_seconds: number;
  idle_expires_at: string;
  absolute_expires_at: string;
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface MeResponse {
  user_id: number;
  username: string;
  role: 'ADMIN' | 'SELLER';
  status: string;
}

export interface AccessTokenPayload {
  userId: number;
  role: 'ADMIN' | 'SELLER';
  deviceId?: string;
  jti: string;
  iat?: number;
  exp?: number;
}