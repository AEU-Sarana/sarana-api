import { param, query } from 'express-validator';

export const getStockValidator = [
  param('productId').optional().isInt().withMessage('Invalid product ID'),
  query('version').optional().isInt({ min: 1 }).withMessage('Version must be a positive integer'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];