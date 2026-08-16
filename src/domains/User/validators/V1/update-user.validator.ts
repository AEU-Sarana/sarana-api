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

  body('password')
    .optional()
    .isLength({ min: 4 })
    .withMessage('Password must be at least 4 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('role')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Role cannot be empty'),
];