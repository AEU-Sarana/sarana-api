import { query } from 'express-validator';

export const exportDataValidator = [
  query('format')
    .notEmpty()
    .withMessage('format is required')
    .isIn(['CSV', 'PDF'])
    .withMessage('format must be CSV or PDF'),
  query('table')
    .notEmpty()
    .withMessage('table is required')
    .isString()
    .withMessage('table must be a string'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('start_date must be a valid date (YYYY-MM-DD)'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('end_date must be a valid date (YYYY-MM-DD)'),
];
