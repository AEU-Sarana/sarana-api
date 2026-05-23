import { body } from 'express-validator';

export const logoutValidator = [
  body('refresh_token')
    .trim()
    .notEmpty()
    .withMessage('refresh_token is required')
    .isString()
    .isLength({ min: 32, max: 1024 }),
];
