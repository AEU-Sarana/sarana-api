export interface RolePermissionInput {
  feature_key: string;
  actions: string[];
}

export interface CreateRoleRequest {
  key: string;
  name: string;
  description?: string;
  permissions?: RolePermissionInput[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: RolePermissionInput[];
}

export interface RolePermissionResponse {
  feature_key: string;
  actions: string[];
}

export interface RoleResponse {
  role_id: number;
  key: string;
  name: string;
  description?: string | null;
  is_system: boolean;
  user_count?: number;
  permissions: RolePermissionResponse[];
  created_at: Date;
  updated_at: Date;
}
