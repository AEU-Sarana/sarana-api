import { body } from 'express-validator';

export const sendReportValidator = [
  body('shift_id')
    .isInt({ gt: 0 })
    .withMessage('Shift ID must be positive'),
  body('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format'),
];