"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportDataValidator = void 0;
const express_validator_1 = require("express-validator");
exports.exportDataValidator = [
    (0, express_validator_1.query)('format')
        .notEmpty()
        .withMessage('format is required')
        .isIn(['CSV', 'PDF'])
        .withMessage('format must be CSV or PDF'),
    (0, express_validator_1.query)('table')
        .notEmpty()
        .withMessage('table is required')
        .isString()
        .withMessage('table must be a string'),
    (0, express_validator_1.query)('start_date')
        .optional()
        .isISO8601()
        .withMessage('start_date must be a valid date (YYYY-MM-DD)'),
    (0, express_validator_1.query)('end_date')
        .optional()
        .isISO8601()
        .withMessage('end_date must be a valid date (YYYY-MM-DD)'),
];
//# sourceMappingURL=export-data.validator.js.map