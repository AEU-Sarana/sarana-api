import { body } from 'express-validator';

export const updateReceiptSettingsValidator = [
  body('store_name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('store_name must be between 2 and 200 characters'),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('address').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('tax_id').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('footer_note').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('is_logo_enabled').optional().isBoolean(),
  body('is_footer_enabled').optional().isBoolean(),
];