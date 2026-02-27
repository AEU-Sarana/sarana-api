export interface PlanResponse {
    id: number;
    package_name: string;
    plan_type: string;
    name: string;
    price: number;
    duration_days: number;
}

export interface ListPlansResponse {
    plans: PlanResponse[];
}

export interface CreatePlanRequest {
    plan_name: string;
    package_id: number;
    plan_type: string;
    price: number;
}

export interface CreatePlanResponse {
    id: number;
    plan_name: string;
    package_id: number;
    plan_type: string;
    price: number;
    created_at: Date;
}
