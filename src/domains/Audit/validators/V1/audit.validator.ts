import { query, param } from 'express-validator';

export const listAuditLogsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('userId').optional().isInt().withMessage('User ID must be an integer'),
  query('action').optional().isString().trim(),
  query('entityType').optional().isString().trim(),
  query('search').optional().isString().trim(),
  query('dateFrom').optional().isISO8601().withMessage('dateFrom must be a valid ISO8601 date'),
  query('dateTo').optional().isISO8601().withMessage('dateTo must be a valid ISO8601 date'),
  query('sortBy').optional().isIn(['createdAt', 'action', 'entityType', 'logId']).withMessage('Invalid sortBy field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
];

export const getAuditLogValidator = [
  param('id').isInt({ min: 1 }).withMessage('Audit log ID must be a valid positive integer'),
];
