import { body } from 'express-validator';

export const updatePlanValidator = [
    body('plan_name')
        .optional()
        .isString()
        .trim()
        .notEmpty()
        .withMessage('Plan name must not be empty if provided')
        .isLength({ max: 100 })
        .withMessage('Plan name must not exceed 100 characters'),

    body('package_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Package ID must be a positive integer'),

    body('plan_type')
        .optional()
        .isString()
        .trim()
        .notEmpty()
        .withMessage('Plan type must not be empty if provided')
        .isIn(['MONTHLY', 'YEARLY', 'LIFETIME', 'TRIAL'])
        .withMessage('Plan type must be MONTHLY, YEARLY, LIFETIME, or TRIAL'),

    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number or zero'),

    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be a boolean'),
];
