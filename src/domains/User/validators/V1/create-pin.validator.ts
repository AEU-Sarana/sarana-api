import { body, param } from 'express-validator';

export const createPinValidator = [
  param('id').isInt().withMessage('Invalid user ID'),
  body('pin').isString().isLength({ min: 4, max: 6 }).withMessage('PIN must be 4-6 digits'),
];