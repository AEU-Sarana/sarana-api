import { param } from 'express-validator';

export const getShiftValidator = [
  param('id').isInt().withMessage('Invalid shift ID'),
];