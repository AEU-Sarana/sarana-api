import { body, oneOf } from 'express-validator';

export const refreshTokenValidator = [
  oneOf([
    body('refresh_token')
      .trim()
      .notEmpty()
      .withMessage('refresh_token is required')
      .isString()
      .isLength({ min: 32, max: 1024 }),
    body('refreshToken')
      .trim()
      .notEmpty()
      .withMessage('refreshToken is required')
      .isString()
      .isLength({ min: 32, max: 1024 }),
  ], { message: 'refresh_token is required' }),

  body('device_id')
    .optional()
    .isString()
    .isLength({ min: 1, max: 255 }),
];
