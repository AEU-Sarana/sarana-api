import { TenantStatus } from '../../enums/V1';

export interface UpdateTenantRequest {
    business_name?: string;
    username?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    status?: TenantStatus;
}

export interface UpdateTenantResponse {
    id: number;
    business_name: string;
    username: string;
    full_name: string;
    email: string;
    phone: string;
    address: string;
    status: string;
    updated_at: Date;
}
