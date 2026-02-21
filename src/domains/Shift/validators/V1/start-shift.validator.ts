import { body } from 'express-validator';

export const startShiftValidator = [
  body('opening_cash').notEmpty().isFloat({ min: 0 }).withMessage('Opening cash must be a non-negative number'),
  body('exchange_rate').notEmpty().isFloat({ min: 0 }).withMessage('Exchange rate must be a non-negative number'),
];