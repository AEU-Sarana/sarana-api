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
  body('device_binding_enabled')
    .notEmpty()
    .isBoolean()
    .withMessage('device_binding_enabled must be a boolean')
    .toBoolean(),
  body('stock_sync_policy')
    .notEmpty()
    .isIn(Object.values(StockSyncPolicy))
    .withMessage('stock_sync_policy must be allow_with_cached or block_until_sync'),
];
