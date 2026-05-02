import { query } from 'express-validator';

export const listUsersValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['ADMIN', 'CASHIER', 'RECEIVER']).withMessage('Role must be ADMIN, CASHIER, or RECEIVER'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
  query('search').optional().isString().trim(),
];