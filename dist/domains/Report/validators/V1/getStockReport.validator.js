"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStockReportValidator = void 0;
const express_validator_1 = require("express-validator");
exports.getStockReportValidator = [
    (0, express_validator_1.query)('period')
        .optional()
        .isIn(['daily', 'weekly', 'monthly', 'yearly'])
        .withMessage('period must be daily, weekly, monthly, or yearly'),
    (0, express_validator_1.query)('low_stock_only')
        .optional()
        .isBoolean()
        .withMessage('low_stock_only must be boolean'),
];
//# sourceMappingURL=getStockReport.validator.js.map