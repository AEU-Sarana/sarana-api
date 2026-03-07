import { body } from 'express-validator';

export const createPlanValidator = [
    body('plan_name')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('Plan name is required')
        .isLength({ max: 100 })
        .withMessage('Plan name must not exceed 100 characters'),

    body('package_id')
        .isInt()
        .withMessage('Package ID must be an integer'),

    body('plan_type')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('Plan type is required')
        .isIn(['MONTHLY', 'YEARLY', 'LIFETIME', 'TRIAL'])
        .withMessage('Plan type must be MONTHLY, YEARLY, LIFETIME, or TRIAL'),

    body('price')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number or zero'),
];
