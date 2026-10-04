"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forgotPasswordValidator = void 0;
const express_validator_1 = require("express-validator");
exports.forgotPasswordValidator = [
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
//# sourceMappingURL=forgot-password.validator.js.map