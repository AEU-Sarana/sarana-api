import { body } from 'express-validator';

export const stockReturnValidator = [
  body('product_id').isInt().withMessage('Product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('order_id').optional().isInt().withMessage('Order ID must be an integer'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
];