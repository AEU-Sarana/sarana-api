"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReceiptLinkValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createReceiptLinkValidator = [
    (0, express_validator_1.param)('order_id').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
];
//# sourceMappingURL=create-receipt-link.validator.js.map