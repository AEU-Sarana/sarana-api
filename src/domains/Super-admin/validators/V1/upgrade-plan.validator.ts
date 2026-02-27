import { body } from 'express-validator';
import { PlanType } from '../../enums/V1';

export const upgradePlanValidator = [
    body('package_id')
        .isInt()
        .withMessage('Package ID must be an integer'),
    body('plan_type')
        .isIn(Object.values(PlanType))
        .withMessage(`Plan type must be one of: ${Object.values(PlanType).join(', ')}`),
    body('start_date')
        .isString()
        .notEmpty()
        .withMessage('Start date is required'),
    body('end_date')
        .isString()
        .notEmpty()
        .withMessage('End date is required'),
];
