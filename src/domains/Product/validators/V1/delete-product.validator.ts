import { param } from 'express-validator';

export const deleteProductValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid product ID'),
];