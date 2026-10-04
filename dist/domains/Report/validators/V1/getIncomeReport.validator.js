"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIncomeReportValidator = void 0;
const express_validator_1 = require("express-validator");
exports.getIncomeReportValidator = [
    (0, express_validator_1.query)('period')
        .optional()
        .isIn(['today', 'daily', 'weekly', 'monthly', 'yearly'])
        .withMessage('period must be today, daily, weekly, monthly, or yearly'),
];
//# sourceMappingURL=getIncomeReport.validator.js.map