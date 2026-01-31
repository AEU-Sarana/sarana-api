import { body } from 'express-validator';

export const sendTestMessageValidator = [
  body('bot_token')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Bot token is required'),
  body('message')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Message must be a non-empty string'),
  body('parse_mode')
    .optional()
    .isIn(['Markdown', 'HTML'])
    .withMessage('parse_mode must be either Markdown or HTML'),
];
