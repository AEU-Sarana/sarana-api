import { body } from 'express-validator';
import { ReportType } from '../../enums/report-type.enum';
import { ReportExportFormat } from '../../enums/export-format.enum';

export const exportReportValidator = [
  body('report_type')
    .notEmpty()
    .withMessage('report_type is required')
    .isIn(Object.values(ReportType))
    .withMessage(
      `report_type must be one of: ${Object.values(ReportType).join(', ')}`
    ),

  // Daily sales filters
  body('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date must be in YYYY-MM-DD format'),

  // Sales history filters
  body('start_date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('start_date must be in YYYY-MM-DD format'),

  body('end_date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('end_date must be in YYYY-MM-DD format')
    .custom((endDate, { req }) => {
      if (endDate && req.body.start_date && new Date(endDate) < new Date(req.body.start_date)) {
        throw new Error('end_date must be greater than or equal to start_date');
      }
      return true;
    }),

  body('seller_id')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('seller_id must be a valid positive integer'),

  body('product_id')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('product_id must be a valid positive integer'),

  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),

  // Stock summary filters
  body('low_stock_only')
    .optional()
    .isBoolean()
    .withMessage('low_stock_only must be a boolean'),

  body('format')
    .optional()
    .isIn(Object.values(ReportExportFormat))
    .withMessage(
      `format must be one of: ${Object.values(ReportExportFormat).join(', ')}`
    ),
];
