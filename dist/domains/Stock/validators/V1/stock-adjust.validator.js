"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockAdjustValidator = void 0;
const express_validator_1 = require("express-validator");
exports.stockAdjustValidator = [
    (0, express_validator_1.body)('product_id').isInt().withMessage('Product ID is required'),
    (0, express_validator_1.body)('quantity').isInt().withMessage('Quantity adjustment is required (can be negative)'),
    (0, express_validator_1.body)('reason').optional().isString().withMessage('Reason must be a string')
];
//# sourceMappingURL=stock-adjust.validator.js.map