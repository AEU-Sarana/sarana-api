import { body } from 'express-validator';

export const changePINValidator = [
  body('current_pin')
    .notEmpty()
    .withMessage('Current PIN is required')
    .isString()
    .withMessage('Current PIN must be a string')
    .isLength({ min: 4, max: 6 })
    .withMessage('Current PIN must be 4-6 digits')
    .matches(/^\d{4,6}$/)
    .withMessage('Current PIN must contain only numeric digits'),
  
  body('new_pin')
    .notEmpty()
    .withMessage('New PIN is required')
    .isString()
    .withMessage('New PIN must be a string')
    .isLength({ min: 4, max: 6 })
    .withMessage('New PIN must be 4-6 digits')
    .matches(/^\d{4,6}$/)
    .withMessage('New PIN must contain only numeric digits'),
];

