import { param, body } from 'express-validator';

export const closeShiftValidator = [
  param('id').isInt().withMessage('Invalid shift ID'),
  body('actual_cash').notEmpty().isFloat({ min: 0 }).withMessage('Actual cash must be a non-negative number'),
  body('pending_orders_count')
    .customSanitizer((value) => (value === null || value === undefined || value === '' ? 0 : value))
    .isInt({ min: 0 })
    .withMessage('pending_orders_count must be a non-negative integer')
    .toInt(),
  body('last_order_sync_at')
    .optional()
    .isISO8601()
    .withMessage('last_order_sync_at must be a valid ISO8601 timestamp'),
  body('close_mode')
    .optional()
    .isIn(['NORMAL', 'FORCED'])
    .withMessage('close_mode must be NORMAL or FORCED'),
  body('force_close')
    .optional()
    .isBoolean()
    .withMessage('force_close must be a boolean')
    .toBoolean(),
  body('force_close_reason')
    .optional()
    .custom((value, { req }) => {
      const closeMode = req.body.close_mode;
      const forceClose = req.body.force_close === true || req.body.force_close === 'true';
      const isForced = closeMode === 'FORCED' || (closeMode == null && forceClose);
      if (isForced && (!value || String(value).trim().length === 0)) {
        throw new Error('force_close_reason is required when close_mode is FORCED');
      }
      return true;
    }),
];
