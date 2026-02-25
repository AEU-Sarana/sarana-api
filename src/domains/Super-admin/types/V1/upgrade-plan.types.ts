import { PlanType } from '../../enums/V1';

export interface UpgradePlanRequest {
    package_id: number;
    plan_type: PlanType;
    start_date: string;
    end_date: string;
}

export interface UpgradePlanResponse {
    tenant_id: number;
    new_plan: string;
    status: string;
    start_date: Date;
    end_date: Date | null;
}
