import { body } from 'express-validator';

export const registerDeviceValidator = [
  body('device_id')
    .trim()
    .notEmpty()
    .withMessage('Device ID is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Device ID must be between 1 and 255 characters'),
  
  body('device_name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Device name must be less than 200 characters'),
];