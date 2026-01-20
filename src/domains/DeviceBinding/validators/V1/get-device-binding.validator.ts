import { param } from 'express-validator';

export const getDeviceBindingValidator = [
  param('id').isInt().withMessage('Invalid device binding ID'),
];