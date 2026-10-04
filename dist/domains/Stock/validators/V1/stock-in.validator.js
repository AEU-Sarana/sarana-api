"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockInValidator = void 0;
const express_validator_1 = require("express-validator");
exports.stockInValidator = [
    (0, express_validator_1.body)('product_id').isInt().withMessage('Product ID is required'),
    (0, express_validator_1.body)('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    (0, express_validator_1.body)('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be a positive number'),
    (0, express_validator_1.body)('supplier').optional().isString().isLength({ max: 200 }).withMessage('Supplier must be a string'),
    (0, express_validator_1.body)('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('received_at').optional().isISO8601().withMessage('Received date must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('expired_at').optional().isISO8601().withMessage('Expiry date must be a valid ISO 8601 date'),
];
//# sourceMappingURL=stock-in.validator.js.map