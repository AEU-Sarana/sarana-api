"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerValidator = exports.updateCustomerValidator = exports.createCustomerValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createCustomerValidator = [
    (0, express_validator_1.body)('full_name')
        .trim()
        .notEmpty()
        .withMessage('Full name is required')
        .isLength({ min: 1, max: 255 })
        .withMessage('Full name must be 1-255 characters'),
    (0, express_validator_1.body)('phone')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 20 })
        .withMessage('Phone number must be <= 20 characters'),
    (0, express_validator_1.body)('email')
        .optional({ nullable: true })
        .trim()
        .isEmail()
        .withMessage('Invalid email format')
        .isLength({ max: 255 })
        .withMessage('Email must be <= 255 characters'),
];
exports.updateCustomerValidator = [
    (0, express_validator_1.param)('id').isInt({ min: 1 }).withMessage('Customer ID must be a positive integer'),
    (0, express_validator_1.body)('full_name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Full name cannot be empty')
        .isLength({ min: 1, max: 255 })
        .withMessage('Full name must be 1-255 characters'),
    (0, express_validator_1.body)('phone')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 20 })
        .withMessage('Phone number must be <= 20 characters'),
    (0, express_validator_1.body)('email')
        .optional({ nullable: true })
        .trim()
        .isEmail()
        .withMessage('Invalid email format')
        .isLength({ max: 255 })
        .withMessage('Email must be <= 255 characters'),
];
exports.getCustomerValidator = [
    (0, express_validator_1.param)('id').isInt({ min: 1 }).withMessage('Customer ID must be a positive integer'),
];
//# sourceMappingURL=customer.validator.js.map