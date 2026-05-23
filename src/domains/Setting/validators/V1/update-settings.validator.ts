import { body } from 'express-validator';
import { BackupFrequency, StockSyncPolicy } from '@src/domains/Setting/enums';

export const updateSettingsValidator = [
  body('auto_backup')
    .notEmpty()
    .isBoolean()
    .withMessage('auto_backup must be a boolean')
    .toBoolean(),
  body('backup_frequency')
    .notEmpty()
    .isIn(Object.values(BackupFrequency))
    .withMessage('backup_frequency must be daily, weekly, or monthly'),
  body('backup_schedule_time')
    .optional()
    .isString()
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('backup_schedule_time must be in HH:mm format'),
  body('stock_sync_policy')
    .notEmpty()
    .isIn(Object.values(StockSyncPolicy))
    .withMessage('stock_sync_policy must be allow_with_cached or block_until_sync'),
  body('report_send_enabled')
    .optional()
    .isBoolean()
    .withMessage('report_send_enabled must be a boolean')
    .toBoolean(),
  body('report_send_time')
    .optional()
    .isString()
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('report_send_time must be in HH:mm format'),
  body('report_send_timezone')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('report_send_timezone must be a valid timezone string'),
];
