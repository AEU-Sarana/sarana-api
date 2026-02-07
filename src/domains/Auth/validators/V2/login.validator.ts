import { body } from 'express-validator';

export const loginValidator = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('username is required')
    .isLength({ min: 3, max: 100 }),
  body('password')
    .notEmpty()
    .withMessage('password is required')
    .isLength({ min: 6 }),
  body('device_id')
    .optional()
    .isString()
    .isLength({ min: 1, max: 255 }),
];