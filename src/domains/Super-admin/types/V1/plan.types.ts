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
    feature_code?: string;
    feature_value?: string;
}

export interface CreatePlanResponse {
    id: number;
    plan_name: string;
    package_id: number;
    plan_type: string;
    price: number;
    feature_code?: string | null;
    feature_value?: string | null;
    created_at: Date;
}
