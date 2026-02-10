import { body } from 'express-validator';

export const telegramWebhookValidator = [
  body('update_id')
    .exists()
    .isInt({ min: 1 })
    .withMessage('update_id must be a positive integer'),
  body().custom((value) => {
    // Basic check for update_id is enough, we handle relevant fields in the service
    return true;
  }),
];
