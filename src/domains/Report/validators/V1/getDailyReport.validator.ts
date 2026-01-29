import { query } from 'express-validator';

export const getDailyReportValidator = [
  query('date')
    .notEmpty()
    .withMessage('date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date must be in YYYY-MM-DD format'),

  query('seller_id')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('seller_id must be a valid integer'),
];
