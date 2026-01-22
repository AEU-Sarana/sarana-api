import { body } from 'express-validator';

export const stockAdjustValidator = [
  body('product_id').isInt().withMessage('Product ID is required'),
  body('quantity').isInt().withMessage('Quantity adjustment is required (can be negative)'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  body('pin').notEmpty().withMessage('PIN is required for stock adjustment'),
];