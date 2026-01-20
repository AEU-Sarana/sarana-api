import { param } from 'express-validator';

export const revokeDeviceValidator = [
  param('id').isInt().withMessage('Invalid device binding ID'),
];