import { query } from 'express-validator';

export const listDeviceBindingsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('user_id').optional().isInt().withMessage('User ID must be an integer'),
  query('status').optional().isIn(['PENDING', 'APPROVED', 'REVOKED']).withMessage('Status must be PENDING, APPROVED, or REVOKED'),
];