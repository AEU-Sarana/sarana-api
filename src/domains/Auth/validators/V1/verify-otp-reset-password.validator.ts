import { body, oneOf } from 'express-validator';

export const verifyOtpResetPasswordValidator = [
  oneOf([
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required'),
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required'),
    body('identifier')
      .trim()
      .notEmpty()
      .withMessage('Email is required'),
  ], { message: 'Email is required' }),
  body('otp_code')
    .trim()
    .notEmpty()
    .withMessage('OTP code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP code must be 6 digits')
    .isNumeric()
    .withMessage('OTP code must contain only numbers'),
];
