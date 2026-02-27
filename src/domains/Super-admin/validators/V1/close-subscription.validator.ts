import { body } from 'express-validator';

export const closeSubscriptionValidator = [
    body('reason')
        .isString()
        .isLength({ min: 5 })
        .withMessage('Reason must be at least 5 characters long')
];
