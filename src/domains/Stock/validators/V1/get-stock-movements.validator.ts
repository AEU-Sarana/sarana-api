import { query } from 'express-validator';

export const getStockMovementsValidator = [
  query('product_id').optional().isInt().withMessage('Product ID must be an integer'),
  query('movement_type')
    .optional()
    .isIn(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'RETURN'])
    .withMessage('Movement type must be STOCK_IN, STOCK_OUT, ADJUSTMENT, or RETURN'),
  query('date_from').optional().isISO8601().withMessage('Date from must be a valid ISO 8601 date'),
  query('date_to').optional().isISO8601().withMessage('Date to must be a valid ISO 8601 date'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('Limit must be between 1 and 10000'),
];