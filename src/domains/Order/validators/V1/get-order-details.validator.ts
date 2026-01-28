import { param } from 'express-validator';

export const getOrderValidator = [
  param('id').isInt().withMessage('Invalid order ID'),
];