import { param } from 'express-validator';

export const deactivateUserValidator = [
  param('id').isInt().withMessage('Invalid user ID'),
];