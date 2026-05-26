import { param } from 'express-validator';

export const createReceiptLinkValidator = [
  param('order_id').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
];