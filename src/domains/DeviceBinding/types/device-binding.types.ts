import { DeviceStatus } from '../enums';

// Request Types
export interface ListDeviceBindingsRequest {
  page?: number;
  limit?: number;
  user_id?: number;
  status?: DeviceStatus | string;
}

export interface GetDeviceBindingRequest {
  bindingId: number;
}

export interface RegisterDeviceRequest {
  device_id: string;
  device_name?: string;
}

export interface ApproveDeviceRequest {
  bindingId: number;
}

export interface RevokeDeviceRequest {
  bindingId: number;
}

export interface RemoveDeviceRequest {
  bindingId: number;
}

// Response Types (snake_case for API)
export interface DeviceBindingResponse {
  binding_id: number;
  user_id: number;
  seller_name: string;
  device_id: string;
  device_name?: string | null;
  status: DeviceStatus;
  approved_by?: number | null;
  approved_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DeviceBindingDetailResponse extends DeviceBindingResponse {
  approved_by_name?: string | null;
}

export interface ListDeviceBindingsResponse {
  device_bindings: DeviceBindingResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetDeviceBindingResponse extends DeviceBindingDetailResponse {}

export interface RegisterDeviceResponse {
  binding_id: number;
  user_id: number;
  device_id: string;
  device_name?: string | null;
  status: DeviceStatus;
  created_at: Date;
  updated_at: Date;
}

export interface ApproveDeviceResponse {
  binding_id: number;
  status: DeviceStatus;
  approved_by: number;
  approved_at: Date;
  updated_at: Date;
}

export interface RevokeDeviceResponse {
  binding_id: number;
  status: DeviceStatus;
  revoked_by: number;
  revoked_at: Date;
  updated_at: Date;
}