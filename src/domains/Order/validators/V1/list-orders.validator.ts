import { query } from 'express-validator';

export const listOrdersValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('shift_id').optional().isInt().withMessage('Shift ID must be an integer'),
  query('seller_id').optional().isInt().withMessage('Seller ID must be an integer'),
  query('start_date').optional().isISO8601().withMessage('Start date must be ISO8601 format'),
  query('end_date').optional().isISO8601().withMessage('End date must be ISO8601 format'),
];