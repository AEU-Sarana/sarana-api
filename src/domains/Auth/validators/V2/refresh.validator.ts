import { body } from 'express-validator';

export const refreshValidator = [
  body('refresh_token')
    .trim()
    .notEmpty()
    .withMessage('refresh_token is required')
    .isString()
    .isLength({ min: 32, max: 1024 }),
  body('device_id')
    .optional()
    .isString()
    .isLength({ min: 1, max: 255 }),
];