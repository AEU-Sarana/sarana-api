"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createOrderValidator = [
    (0, express_validator_1.body)('payment_method')
        .isIn(['CASH', 'BANK'])
        .withMessage('Payment method must be CASH or BANK'),
    (0, express_validator_1.body)('received_amount')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('Received amount must be a positive number'),
    (0, express_validator_1.body)('discount_amount')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('Discount amount must be a positive number'),
    (0, express_validator_1.body)('tax_amount')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('Tax amount must be a positive number'),
    (0, express_validator_1.body)('service_fee')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('Service fee must be a positive number'),
    (0, express_validator_1.body)('items')
        .isArray({ min: 1 })
        .withMessage('Items must be an array with at least one item'),
    (0, express_validator_1.body)('items.*.product_id')
        .isInt()
        .withMessage('Product ID must be an integer'),
    (0, express_validator_1.body)('items.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be a positive integer'),
    (0, express_validator_1.body)('items.*.unit_price')
        .isFloat({ min: 0 })
        .withMessage('Unit price must be a positive number'),
    (0, express_validator_1.body)('items.*.discount_amount')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('Discount amount must be a positive number'),
    (0, express_validator_1.body)('items.*.subtotal')
        .isFloat({ min: 0 })
        .withMessage('Subtotal must be a positive number'),
];
//# sourceMappingURL=create-order.validator.js.map