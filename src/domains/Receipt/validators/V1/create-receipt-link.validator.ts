import { param } from 'express-validator';

export const createReceiptLinkValidator = [
  param('order_uuid').isUUID().withMessage('Order UUID must be a valid UUID'),
];