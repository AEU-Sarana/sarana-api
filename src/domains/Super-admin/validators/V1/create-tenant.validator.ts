import { body } from 'express-validator';
import { TenantStatus, PlanType } from '../../enums/V1';

export const createTenantValidator = [
    body('business_name')
        .isString()
        .isLength({ min: 2, max: 200 })
        .withMessage('Business name must be between 2 and 200 characters'),
    body('username')
        .isString()
        .isLength({ min: 3, max: 100 })
        .withMessage('Username must be between 3 and 100 characters'),
    body('full_name')
        .isString()
        .isLength({ min: 2, max: 200 })
        .withMessage('Full name must be between 2 and 200 characters'),
    body('email')
        .isEmail()
        .withMessage('Invalid email format'),
    body('phone')
        .isString()
        .isLength({ min: 8, max: 20 })
        .withMessage('Phone number must be between 8 and 20 characters'),
    body('address')
        .isString()
        .isLength({ min: 5 })
        .withMessage('Address must be at least 5 characters long'),
    body('status')
        .optional()
        .isIn(Object.values(TenantStatus))
        .withMessage(`Status must be one of: ${Object.values(TenantStatus).join(', ')}`),
    body('package_id')
        .isInt()
        .withMessage('Package ID must be an integer'),
    body('plan_type')
        .isIn(Object.values(PlanType))
        .withMessage(`Plan type must be one of: ${Object.values(PlanType).join(', ')}`),
    body('start_time')
        .isString()
        .notEmpty()
        .withMessage('Start time is required'),
    body('end_time')
        .isString()
        .notEmpty()
        .withMessage('End time is required'),
    body('payment_method')
        .optional()
        .isString()
        .withMessage('Payment method must be a string'),
    body('price')
        .optional()
        .isNumeric()
        .withMessage('Price must be a number'),
    body('transaction_id')
        .optional()
        .isString()
        .withMessage('Transaction ID must be a string'),
];
