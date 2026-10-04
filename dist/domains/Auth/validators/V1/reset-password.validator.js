"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordValidator = exports.resetPasswordRequestValidator = void 0;
const express_validator_1 = require("express-validator");
exports.resetPasswordRequestValidator = [
    (0, express_validator_1.oneOf)([
        (0, express_validator_1.body)('username')
            .trim()
            .notEmpty()
            .withMessage('Username is required')
            .isLength({ min: 3, max: 50 })
            .withMessage('Username must be between 3 and 50 characters'),
        (0, express_validator_1.body)('email')
            .trim()
            .notEmpty()
            .withMessage('Email is required')
            .isEmail()
            .withMessage('Invalid email format'),
    ], { message: 'Username or Email is required' }),
];
exports.resetPasswordValidator = [
    (0, express_validator_1.oneOf)([
        (0, express_validator_1.body)('email')
            .trim()
            .notEmpty()
            .withMessage('Email is required'),
        (0, express_validator_1.body)('username')
            .trim()
            .notEmpty()
            .withMessage('Username is required'),
        (0, express_validator_1.body)('identifier')
            .trim()
            .notEmpty()
            .withMessage('Email is required'),
    ], { message: 'Email is required' }),
    (0, express_validator_1.body)('new_password')
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
];
//# sourceMappingURL=reset-password.validator.js.map