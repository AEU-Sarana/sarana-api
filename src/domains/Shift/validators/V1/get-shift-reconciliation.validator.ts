import { param } from 'express-validator';

export const getShiftReconciliationValidator = [
  param('id').isInt().withMessage('Invalid shift ID'),
];