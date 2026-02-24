import { GroupByType } from '../../enums/V1';

export interface UserGrowthResponse {
    group_by: GroupByType;
    year?: number;
    labels: string[];
    data: number[];
}
