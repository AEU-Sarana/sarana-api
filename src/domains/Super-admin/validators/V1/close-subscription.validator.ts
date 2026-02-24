import { body } from 'express-validator';

export const closeSubscriptionValidator = [
    body('reason')
        .isString()
        .isLength({ min: 5 })
        .withMessage('Reason must be at least 5 characters long'),
    body('effective_date')
        .optional()
        .isISO8601()
        .withMessage('Effective date must be a valid ISO 8601 datetime'),
];
