"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailyReportValidator = void 0;
const express_validator_1 = require("express-validator");
exports.getDailyReportValidator = [
    (0, express_validator_1.query)('date')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('date must be in YYYY-MM-DD format'),
    (0, express_validator_1.query)('seller_id')
        .optional()
        .isInt({ gt: 0 })
        .withMessage('seller_id must be a valid integer'),
];
//# sourceMappingURL=getDailyReport.validator.js.map