import { query } from 'express-validator';

export const getStockReportValidator = [
  query('low_stock_only')
    .optional()
    .isBoolean()
    .withMessage('low_stock_only must be boolean'),
];
