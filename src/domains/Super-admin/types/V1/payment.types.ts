export interface PaymentResponse {
    id: number;
    paid_at: Date;
    tenant_name: string;
    plan_name: string;
    amount: number;
    payment_method: string;
    status: string;
}

export interface ListPaymentsResponse {
    payments: PaymentResponse[];
    summary: {
        total_revenue: number;
        pending_count: number;
    };
}
