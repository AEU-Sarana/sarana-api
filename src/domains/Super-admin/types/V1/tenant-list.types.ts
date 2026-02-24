export interface TenantListItem {
    id: number;
    business_name: string;
    username: string;
    email: string;
    status: string;
    subscription?: {
        plan_name: string;
        plan_type: string;
        plan_status: string;
        start_date: string;
        end_date?: string;
    };
}
