import { body, oneOf } from 'express-validator';

export const forgotPasswordValidator = [
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
];
