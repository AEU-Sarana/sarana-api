import { param } from 'express-validator';

export const getUserValidator = [
  param('id').isInt().withMessage('Invalid user ID'),
];