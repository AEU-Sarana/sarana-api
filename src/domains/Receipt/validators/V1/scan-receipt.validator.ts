import { body } from 'express-validator';

export const scanReceiptValidator = [
    body('receipt_code').trim().notEmpty().withMessage('receipt_code is required'),
];
