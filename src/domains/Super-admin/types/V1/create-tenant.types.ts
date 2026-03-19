import { PlanType, TenantStatus } from '../../enums/V1';

export interface CreateTenantRequest {
    business_name: string;
    username: string;
    full_name: string;
    email: string;
    phone: string;
    address: string;
    status: TenantStatus;
    package_id: number;
    plan_type: PlanType;
    start_time: string;
    end_time: string;
    payment_method?: string;
    transaction_id?: string;
    telegram_bot_token?: string;
    telegram_group_id?: string;
}

export interface CreateTenantResponse {
    id: number;
    username: string;
    email?: string | null;
    full_name?: string | null;
    business_name?: string | null;
    phone?: string | null;
    status?: string;
    created_at?: Date;
    updated_at?: Date;
    telegram?: {
        attempted: boolean;
        sent: boolean;
        error?: string;
    };
    [key: string]: unknown;
}
