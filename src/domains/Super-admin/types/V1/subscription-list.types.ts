export interface SubscriptionListItem {
    id: number;
    tenant_id: number;
    business_name: string | null;
    plan_id: number;
    plan_name: string;
    plan_type: string;
    plan_price: number;
    status: string;
    start_date: Date;
    end_date: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface ListSubscriptionsResponse {
    subscriptions: SubscriptionListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface SubscriptionDetailResponse {
    id: number;
    tenant_id: number;
    business_name: string | null;
    username: string;
    email: string | null;
    phone: string | null;
    status: string;
    start_date: Date;
    end_date: Date | null;
    close_reason: string | null;
    effective_close_date: Date | null;
    created_at: Date;
    updated_at: Date;
    plan: {
        id: number;
        name: string;
        type: string;
        price: number;
        package: {
            id: number;
            name: string;
            description: string | null;
            features: Array<{
                feature_code: string;
                feature_value: string | null;
            }>;
        };
    };
    payments: Array<{
        id: number;
        amount: number;
        payment_date: Date;
        payment_method: string;
        status: string;
        transaction_id: string | null;
    }>;
}
