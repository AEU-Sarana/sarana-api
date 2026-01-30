import { body } from 'express-validator';

export const configTelegramValidator = [
  body('bot_token')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Bot token is required'),
  body('group_chat_id')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Group chat ID is required'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
];