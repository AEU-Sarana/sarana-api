import { body } from 'express-validator';

export const uploadReceiptLogoValidator = [
  body('content_type').optional().isIn(['image/png', 'image/jpeg', 'image/webp']),
  body('size_bytes').optional().isInt({ min: 1, max: 2 * 1024 * 1024 }),
];