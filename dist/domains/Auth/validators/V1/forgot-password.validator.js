"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forgotPasswordValidator = void 0;
const express_validator_1 = require("express-validator");
exports.forgotPasswordValidator = [
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
];
//# sourceMappingURL=forgot-password.validator.js.map