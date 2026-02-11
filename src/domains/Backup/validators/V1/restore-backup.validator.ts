import { body } from 'express-validator';

export const restoreBackupValidator = [
  body('backup_id')
    .notEmpty()
    .withMessage('backup_id is required')
    .isInt({ min: 1 })
    .withMessage('backup_id must be a positive integer')
    .toInt(),
];
