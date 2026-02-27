import { query } from 'express-validator';
import { TenantStatus } from '../../enums/V1';

export const tenantListValidator = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('plan_id')
        .optional()
        .isInt()
        .withMessage('Plan ID must be an integer'),
    query('status')
        .optional()
        .isIn(Object.values(TenantStatus))
        .withMessage(`Status must be one of: ${Object.values(TenantStatus).join(', ')}`),
    query('search')
        .optional()
        .isString()
        .withMessage('Search must be a string'),
    query('plan_status')
        .optional()
        .isString()
        .withMessage('Plan status must be a string'),
];
