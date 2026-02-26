import { body } from 'express-validator';
import { TenantStatus } from '../../enums/V1';

export const updateTenantValidator = [
    body('business_name')
        .optional()
        .isString()
        .isLength({ min: 2, max: 200 })
        .withMessage('Business name must be between 2 and 200 characters'),
    body('username')
        .optional()
        .isString()
        .isLength({ min: 3, max: 100 })
        .withMessage('Username must be between 3 and 100 characters'),
    body('full_name')
        .optional()
        .isString()
        .isLength({ min: 2, max: 200 })
        .withMessage('Full name must be between 2 and 200 characters'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Invalid email format'),
    body('phone')
        .optional()
        .isString()
        .isLength({ min: 8, max: 20 })
        .withMessage('Phone number must be between 8 and 20 characters'),
    body('address')
        .optional()
        .isString()
        .isLength({ min: 5 })
        .withMessage('Address must be at least 5 characters long'),
    body('status')
        .optional()
        .isIn(Object.values(TenantStatus))
        .withMessage(`Status must be one of: ${Object.values(TenantStatus).join(', ')}`),
];
