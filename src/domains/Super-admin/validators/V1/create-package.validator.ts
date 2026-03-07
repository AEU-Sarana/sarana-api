import { body } from 'express-validator';

export const createPackageValidator = [
    body('name')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('Package name is required')
        .isLength({ max: 100 })
        .withMessage('Package name must not exceed 100 characters'),

    body('description')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),

    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be a boolean'),

    body('features')
        .optional()
        .isArray()
        .withMessage('Features must be an array'),

    body('features.*.feature_code')
        .if(body('features').isArray({ min: 1 }))
        .isString()
        .trim()
        .notEmpty()
        .withMessage('Feature code is required'),

    body('features.*.feature_value')
        .if(body('features').isArray({ min: 1 }))
        .isString()
        .trim()
        .notEmpty()
        .withMessage('Feature value is required'),
];
