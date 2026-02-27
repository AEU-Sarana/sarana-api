export interface DashboardSummaryResponse {
    stats: {
        total_user: number;
        total_trail: number;
        active_tenants: number;
        total_subscriptions: number;
    };
    subscriptions_overview: {
        monthly: number;
        yearly: number;
        trail: number;
        expired: number;
    };
}
