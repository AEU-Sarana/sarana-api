export interface RenewSubscriptionRequest {
    start_date: string;
    end_date: string;
}

export interface RenewSubscriptionResponse {
    plan_id: number;
    plan_type: string;
    start_date: Date;
    end_date: Date | null;
}
