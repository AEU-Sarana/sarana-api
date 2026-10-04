"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportReportValidator = void 0;
const express_validator_1 = require("express-validator");
const report_type_enum_1 = require("../../enums/report-type.enum");
const export_format_enum_1 = require("../../enums/export-format.enum");
exports.exportReportValidator = [
    (0, express_validator_1.body)('report_type')
        .notEmpty()
        .withMessage('report_type is required')
        .isIn(Object.values(report_type_enum_1.ReportType))
        .withMessage(`report_type must be one of: ${Object.values(report_type_enum_1.ReportType).join(', ')}`),
    // Daily sales filters
    (0, express_validator_1.body)('date')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('date must be in YYYY-MM-DD format'),
    // Sales history filters
    (0, express_validator_1.body)('start_date')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('start_date must be in YYYY-MM-DD format'),
    (0, express_validator_1.body)('end_date')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('end_date must be in YYYY-MM-DD format')
        .custom((endDate, { req }) => {
        if (endDate && req.body.start_date && new Date(endDate) < new Date(req.body.start_date)) {
            throw new Error('end_date must be greater than or equal to start_date');
        }
        return true;
    }),
    (0, express_validator_1.body)('seller_id')
        .optional()
        .isInt({ gt: 0 })
        .withMessage('seller_id must be a valid positive integer'),
    (0, express_validator_1.body)('product_id')
        .optional()
        .isInt({ gt: 0 })
        .withMessage('product_id must be a valid positive integer'),
    (0, express_validator_1.body)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('page must be a positive integer'),
    (0, express_validator_1.body)('limit')
        .optional()
        .isInt({ min: 1, max: 10000 })
        .withMessage('limit must be between 1 and 10000'),
    // Stock summary filters
    (0, express_validator_1.body)('low_stock_only')
        .optional()
        .isBoolean()
        .withMessage('low_stock_only must be a boolean'),
    (0, express_validator_1.body)('format')
        .optional()
        .isIn(Object.values(export_format_enum_1.ReportExportFormat))
        .withMessage(`format must be one of: ${Object.values(export_format_enum_1.ReportExportFormat).join(', ')}`),
];
//# sourceMappingURL=exportReport.validator.js.map