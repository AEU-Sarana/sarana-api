import { query } from 'express-validator';
import { PeriodType } from '../../enums/V1';

export const dashboardSummaryValidator = [
    query('period')
        .optional()
        .isIn(Object.values(PeriodType))
        .withMessage(`Invalid period specified. Allowed: ${Object.values(PeriodType).join(', ')}`),
];
