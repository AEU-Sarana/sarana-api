import { param, query } from 'express-validator';

export const getStockValidator = [
  param('productId').optional().isInt().withMessage('Invalid product ID'),
  query('version').optional().isInt({ min: 1 }).withMessage('Version must be a positive integer'),
  query('status').optional().isIn(['in_stock', 'low_stock', 'out_of_stock', 'negative']).withMessage('Status must be one of: in_stock, low_stock, out_of_stock, negative'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('barcode').optional().isString().withMessage('Barcode must be a string'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];