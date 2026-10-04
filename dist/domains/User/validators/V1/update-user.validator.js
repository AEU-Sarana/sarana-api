"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserValidator = void 0;
const express_validator_1 = require("express-validator");
exports.updateUserValidator = [
    (0, express_validator_1.param)('id').isInt().withMessage('Invalid user ID'),
    (0, express_validator_1.body)('full_name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Full name cannot be empty')
        .isLength({ min: 2, max: 200 })
        .withMessage('Full name must be between 2 and 200 characters'),
    (0, express_validator_1.body)('email')
        .optional()
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    (0, express_validator_1.body)('phone')
        .optional()
        .isString()
        .trim(),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('Status must be active or inactive'),
    (0, express_validator_1.body)('password')
        .optional()
        .isLength({ min: 4 })
        .withMessage('Password must be at least 4 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    (0, express_validator_1.body)('role')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Role cannot be empty'),
];
//# sourceMappingURL=update-user.validator.js.map