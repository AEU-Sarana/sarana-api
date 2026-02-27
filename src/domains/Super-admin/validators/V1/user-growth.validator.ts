import { query } from 'express-validator';
import { GroupByType } from '../../enums/V1';

export const userGrowthValidator = [
    query('group_by')
        .optional()
        .isIn(Object.values(GroupByType))
        .withMessage(`Invalid group_by specified. Allowed: ${Object.values(GroupByType).join(', ')}`),
    query('year')
        .optional()
        .isInt({ min: 2000, max: 2100 })
        .withMessage('Year must be between 2000 and 2100'),
];
