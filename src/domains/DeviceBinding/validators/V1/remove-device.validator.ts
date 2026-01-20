import { param } from 'express-validator';

export const removeDeviceValidator = [
  param('id').isInt().withMessage('Invalid device binding ID'),
];