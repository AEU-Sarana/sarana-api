"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOrdersValidator = void 0;
const express_validator_1 = require("express-validator");
exports.listOrdersValidator = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('Limit must be between 1 and 10000'),
    (0, express_validator_1.query)('shift_id').optional().isInt().withMessage('Shift ID must be an integer'),
    (0, express_validator_1.query)('seller_id').optional().isInt().withMessage('Seller ID must be an integer'),
    (0, express_validator_1.query)('start_date').optional().isISO8601().withMessage('Start date must be ISO8601 format'),
    (0, express_validator_1.query)('end_date').optional().isISO8601().withMessage('End date must be ISO8601 format'),
];
//# sourceMappingURL=list-orders.validator.js.map