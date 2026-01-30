import { body } from 'express-validator';

export const resendReportValidator = [
  body('shift_id')
    .isInt({ gt: 0 })
    .withMessage('Shift ID must be positive'),
];