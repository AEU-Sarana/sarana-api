import { body } from 'express-validator';

export const testTelegramValidator = [
  body('bot_token')
    .optional()
    .isString()
    .trim(),
  body('group_chat_id')
    .optional()
    .isString()
    .trim(),
];