import { body } from 'express-validator';
import { ReportType } from '../../enums/report-type.enum';
import { ReportExportFormat } from '../../enums/export-format.enum';

export const exportReportValidator = [
  body('report_type')
    .notEmpty()
    .withMessage('report_type is required')
    .isIn(Object.values(ReportType))
    .withMessage(`report_type must be one of: ${Object.values(ReportType).join(', ')}`),

  body('filters')
    .notEmpty()
    .withMessage('filters is required')
    .isObject()
    .withMessage('filters must be an object'),

  body('format')
    .notEmpty()
    .withMessage('format is required')
    .isIn(Object.values(ReportExportFormat))
    .withMessage(`format must be one of: ${Object.values(ReportExportFormat).join(', ')}`),
];
