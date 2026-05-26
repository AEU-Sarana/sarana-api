import { body } from 'express-validator';

export const createOrderValidator = [
  body('payment_method')
    .isIn(['CASH', 'BANK'])
    .withMessage('Payment method must be CASH or BANK'),
  body('received_amount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Received amount must be a positive number'),
  body('discount_amount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Discount amount must be a positive number'),
  body('tax_amount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Tax amount must be a positive number'),
  body('service_fee')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Service fee must be a positive number'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be an array with at least one item'),
  body('items.*.product_id')
    .isInt()
    .withMessage('Product ID must be an integer'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('items.*.unit_price')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number'),
  body('items.*.discount_amount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Discount amount must be a positive number'),
  body('items.*.subtotal')
    .isFloat({ min: 0 })
    .withMessage('Subtotal must be a positive number'),
];
