"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalesHistoryReportValidator = void 0;
const express_validator_1 = require("express-validator");
exports.getSalesHistoryReportValidator = [
    (0, express_validator_1.query)('period')
        .optional()
        .isIn(['daily', 'weekly', 'monthly', 'yearly'])
        .withMessage('period must be daily, weekly, monthly, or yearly'),
    (0, express_validator_1.query)('start_date')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('start_date must be in YYYY-MM-DD format'),
    (0, express_validator_1.query)('end_date')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('end_date must be in YYYY-MM-DD format'),
    (0, express_validator_1.query)('seller_id')
        .optional()
        .isInt({ gt: 0 })
        .withMessage('seller_id must be a valid integer'),
    (0, express_validator_1.query)('product_id')
        .optional()
        .isInt({ gt: 0 })
        .withMessage('product_id must be a valid integer'),
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 10000 })
        .withMessage('limit must be between 1 and 10000'),
];
//# sourceMappingURL=getSalesHistoryReport.validator.js.map