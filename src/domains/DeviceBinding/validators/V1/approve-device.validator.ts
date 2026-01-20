import { param } from 'express-validator';

export const approveDeviceValidator = [
  param('id').isInt().withMessage('Invalid device binding ID'),
];