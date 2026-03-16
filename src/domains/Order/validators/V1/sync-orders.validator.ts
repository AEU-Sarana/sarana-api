import { body } from 'express-validator';

export const syncOrdersValidator = [
  body('orders').isArray().withMessage('Orders must be an array'),
  body('orders.*.order_uuid').isUUID().withMessage('Order UUID must be a valid UUID'),
  body('orders.*.receipt_number').trim().notEmpty().withMessage('Receipt number is required'),
  body('orders.*.shift_id').isInt().withMessage('Shift ID must be an integer'),
  body('orders.*.seller_id').optional().isInt().withMessage('Seller ID must be an integer'),
  body('orders.*.order_date')
  .matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  .withMessage('Order date must be in format YYYY-MM-DD HH:mm'),
  body('orders.*.total_amount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
  body('orders.*.discount_amount').optional().isFloat({ min: 0 }),
  body('orders.*.tax_amount').optional().isFloat({ min: 0 }),
  body('orders.*.service_fee').optional().isFloat({ min: 0 }),
  body('orders.*.payment_method')
    .isIn(['CASH', 'BANK'])
    .withMessage('Payment method must be CASH or BANK'),
  body('orders.*.received_amount').optional().isFloat({ min: 0 }),
  body('orders.*.items').isArray().withMessage('Items must be an array'),
  body('orders.*.items.*.product_id').isInt().withMessage('Product ID must be an integer'),
  body('orders.*.items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('orders.*.items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('orders.*.items.*.discount_amount').optional().isFloat({ min: 0 }),
  body('orders.*.items.*.subtotal').isFloat({ min: 0 }).withMessage('Subtotal must be a positive number'),
];
