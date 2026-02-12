import { query } from 'express-validator';

export const getIncomeReportValidator = [
  query('period')
    .optional()
    .isIn(['today', 'daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('period must be today, daily, weekly, monthly, or yearly'),
];
