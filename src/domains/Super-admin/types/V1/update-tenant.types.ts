import { TenantStatus, PlanType } from '../../enums/V1';

export interface UpdateTenantRequest {
    business_name?: string;
    username?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    status?: TenantStatus;
    telegram_bot_token?: string;
    telegram_group_id?: string;
    plan_type?: PlanType;
    payment_method?: string;
    start_time?: string;
    end_time?: string;
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
    telegram?: {
        attempted: boolean;
        sent: boolean;
        error?: string;
    };
}
