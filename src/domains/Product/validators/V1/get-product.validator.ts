import { param } from 'express-validator';

export const getProductValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid product ID'),
];