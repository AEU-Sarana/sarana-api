import { body } from 'express-validator';

export const stockInValidator = [
  body('product_id').isInt().withMessage('Product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be a positive number'),
  body('supplier').optional().isString().isLength({ max: 200 }).withMessage('Supplier must be a string'),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
];