import { body } from 'express-validator';

export const resetPINValidator = [
  body('user_id')
    .notEmpty()
    .withMessage('User ID is required')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  
  body('new_pin')
    .notEmpty()
    .withMessage('New PIN is required')
    .isString()
    .withMessage('PIN must be a string')
    .isLength({ min: 4, max: 6 })
    .withMessage('PIN must be 4-6 digits')
    .matches(/^\d{4,6}$/)
    .withMessage('PIN must contain only numeric digits'),
];

