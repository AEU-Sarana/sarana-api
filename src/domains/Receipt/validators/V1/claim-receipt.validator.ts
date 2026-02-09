import { body } from 'express-validator';

export const claimReceiptValidator = [
  body('code').trim().isLength({ min: 20, max: 255 }).withMessage('Invalid receipt code'),
  body('telegram_user_id').trim().notEmpty().withMessage('telegram_user_id is required'),
  body('telegram_chat_id').trim().notEmpty().withMessage('telegram_chat_id is required'),
  body('telegram_username').optional().isString().isLength({ max: 100 }),
];