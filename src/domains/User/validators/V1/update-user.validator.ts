import { body, param } from 'express-validator';

export const updateUserValidator = [
  param('id').isInt().withMessage('Invalid user ID'),
  
  body('full_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .isLength({ min: 2, max: 200 })
    .withMessage('Full name must be between 2 and 200 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .isString()
    .trim(),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive'),
];