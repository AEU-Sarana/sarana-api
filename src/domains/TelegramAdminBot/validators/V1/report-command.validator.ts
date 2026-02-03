import { body } from 'express-validator';

export const reportCommandValidator = [
  body('date').optional().isISO8601().withMessage('Invalid date')
];
