import { body } from 'express-validator';

export const verifyOtpResetPasswordValidator = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format'),
    body('otp_code')
        .trim()
        .notEmpty()
        .withMessage('OTP code is required')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP code must be 6 digits')
        .isNumeric()
        .withMessage('OTP code must contain only numbers'),
];

