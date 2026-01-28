import { query } from 'express-validator';

export const listShiftsValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('seller_id').optional().isInt(),
  query('status').optional().isIn(['ACTIVE', 'CLOSED']),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
];