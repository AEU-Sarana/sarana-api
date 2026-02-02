import { body } from 'express-validator';

export const createBackupValidator = [
  body('backup_name')
    .trim()
    .notEmpty()
    .withMessage('backup_name is required')
    .isLength({ min: 3, max: 120 })
    .withMessage('backup_name must be between 3 and 120 characters'),
  body('include_data')
    .notEmpty()
    .isBoolean()
    .withMessage('include_data must be a boolean')
    .toBoolean(),
];
