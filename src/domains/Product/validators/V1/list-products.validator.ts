import { query } from 'express-validator';

export const listProductsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('Limit must be between 1 and 10000'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
  query('category').optional().isString().trim().isLength({ max: 100 }).withMessage('Category must be <= 100 chars'),
  query('category_id').optional().isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
  query('search').optional().isString().trim().isLength({ max: 200 }).withMessage('Search must be <= 200 chars'),
  query('barcode').optional().isString().trim().isLength({ max: 255 }).withMessage('Barcode must be <= 255 chars'),
];