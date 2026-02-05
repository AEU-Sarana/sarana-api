import { body } from 'express-validator';

export const telegramWebhookValidator = [
  body('update_id')
    .exists()
    .isInt({ min: 1 })
    .withMessage('update_id must be a positive integer'),
  body().custom((value) => {
    if (!value || (!value.message && !value.callback_query)) {
      throw new Error('message or callback_query is required');
    }
    return true;
  }),
];
