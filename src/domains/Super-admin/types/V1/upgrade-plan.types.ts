import { PlanType } from '../../enums/V1';

export interface UpgradePlanRequest {
    package_id: number;
    plan_type: PlanType;
    start_time: string;
    end_time: string;
}
