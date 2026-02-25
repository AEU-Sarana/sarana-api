import { body } from 'express-validator';

export const renewSubscriptionValidator = [
    body('start_date')
        .isString()
        .notEmpty()
        .withMessage('Start date is required'),
    body('end_date')
        .isString()
        .notEmpty()
        .withMessage('End date is required'),
];
