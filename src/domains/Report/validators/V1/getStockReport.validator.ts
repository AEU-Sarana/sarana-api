import { query } from 'express-validator';

export const getStockReportValidator = [
  query('period')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('period must be daily, weekly, monthly, or yearly'),
  query('low_stock_only')
    .optional()
    .isBoolean()
    .withMessage('low_stock_only must be boolean'),
];
