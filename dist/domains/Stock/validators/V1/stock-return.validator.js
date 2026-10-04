"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockReturnValidator = void 0;
const express_validator_1 = require("express-validator");
exports.stockReturnValidator = [
    (0, express_validator_1.body)('product_id').isInt().withMessage('Product ID is required'),
    (0, express_validator_1.body)('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    (0, express_validator_1.body)('order_id').optional().isInt().withMessage('Order ID must be an integer'),
    (0, express_validator_1.body)('reason').optional().isString().withMessage('Reason must be a string'),
];
//# sourceMappingURL=stock-return.validator.js.map