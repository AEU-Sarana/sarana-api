import { query } from 'express-validator';

export const listSellersValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['active', 'inactive']),
  query('search').optional().isString().trim(),
];