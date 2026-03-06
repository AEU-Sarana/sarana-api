import { body } from 'express-validator';
import { TenantStatus, PlanType } from '../../enums/V1';

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
    body('telegram_bot_token')
        .optional()
        .isString()
        .withMessage('Bot token must be a string'),
    body('telegram_group_id')
        .optional()
        .isString()
        .withMessage('Group ID must be a string'),
    body('plan_type')
        .optional()
        .isIn(Object.values(PlanType))
        .withMessage(`Plan type must be one of: ${Object.values(PlanType).join(', ')}`),
    body('payment_method')
        .optional()
        .isString()
        .withMessage('Payment method must be a string'),
    body('start_time')
        .optional()
        .isISO8601()
        .withMessage('Start time must be a valid ISO8601 date'),
    body('end_time')
        .optional()
        .isISO8601()
        .withMessage('End time must be a valid ISO8601 date'),
];
