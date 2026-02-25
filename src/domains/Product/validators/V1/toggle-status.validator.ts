import { param } from 'express-validator';

export const toggleStatusValidator = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Product ID must be a positive integer')
        .toInt(),
];
