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
        .isIn(['MONTHLY', 'YEARLY'])
        .withMessage('Plan type must be either MONTHLY or YEARLY'),

    body('price')
        .isDecimal()
        .withMessage('Price must be a decimal number'),

    body('feature_code')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Feature code must not exceed 100 characters'),

    body('feature_value')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Feature value must not exceed 255 characters'),
];
