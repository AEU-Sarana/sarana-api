import { query } from 'express-validator';

export const getSalesHistoryReportValidator = [
  query('period')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('period must be daily, weekly, monthly, or yearly'),

  query('start_date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('start_date must be in YYYY-MM-DD format'),

  query('end_date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('end_date must be in YYYY-MM-DD format'),

  query('seller_id')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('seller_id must be a valid integer'),

  query('product_id')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('product_id must be a valid integer'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('limit must be between 1 and 10000'),
];
