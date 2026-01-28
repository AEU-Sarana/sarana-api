import { param, body } from 'express-validator';

export const closeShiftValidator = [
  param('id').isInt().withMessage('Invalid shift ID'),
  body('actual_cash').notEmpty().isFloat({ min: 0 }).withMessage('Actual cash must be a non-negative number'),
];