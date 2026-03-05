import { Feature } from './package.types';

export interface PlanResponse {
    id: number;
    package_name: string;
    plan_type: string;
    name: string;
    price: number;
    duration_days: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface PlanDetailResponse extends PlanResponse {
    package_id: number;
    package_description: string | null;
    features: Feature[];
    stats: {
        active_subscriptions: number;
        total_subscriptions: number;
    };
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
    is_active: boolean;
    created_at: Date;
}

export interface UpdatePlanRequest {
    plan_name?: string;
    package_id?: number;
    plan_type?: string;
    price?: number;
    is_active?: boolean;
}

export interface UpdatePlanResponse {
    id: number;
    plan_name: string;
    package_id: number;
    plan_type: string;
    price: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
