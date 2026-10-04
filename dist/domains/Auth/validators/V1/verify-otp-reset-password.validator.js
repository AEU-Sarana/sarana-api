"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtpResetPasswordValidator = void 0;
const express_validator_1 = require("express-validator");
exports.verifyOtpResetPasswordValidator = [
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
    (0, express_validator_1.body)('otp_code')
        .trim()
        .notEmpty()
        .withMessage('OTP code is required')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP code must be 6 digits')
        .isNumeric()
        .withMessage('OTP code must contain only numbers'),
];
//# sourceMappingURL=verify-otp-reset-password.validator.js.map