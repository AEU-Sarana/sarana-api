export interface TenantListItem {
    id: number;
    business_name: string;
    username: string;
    email: string;
    status: string;
    subscription?: {
        id: number;
        plan_name: string;
        plan_type: string;
        price: number;
        plan_status: string;
        start_date: string;
        end_date?: string;
    };
}
