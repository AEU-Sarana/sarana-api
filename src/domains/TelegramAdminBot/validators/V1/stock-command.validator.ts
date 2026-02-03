import { body } from 'express-validator';

export const stockCommandValidator = [
  body('product_code').isString().notEmpty(),
  body('qty').isInt({ min: 1 })
];
