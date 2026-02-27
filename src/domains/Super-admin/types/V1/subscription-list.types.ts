export interface SubscriptionListItem {
    id: number;
    tenant_id: number;
    business_name: string | null;
    username: string;
    plan_id: number;
    plan_name: string;
    plan_type: string;
    plan_price: number;
    status: string;
    start_date: Date;
    end_date: Date | null;
    close_reason: string | null;
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
