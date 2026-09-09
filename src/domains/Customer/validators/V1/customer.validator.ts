import { body, param } from 'express-validator';

export const createCustomerValidator = [
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Full name must be 1-255 characters'),
  body('phone')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must be <= 20 characters'),
  body('email')
    .optional({ nullable: true })
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .isLength({ max: 255 })
    .withMessage('Email must be <= 255 characters'),
];

export const updateCustomerValidator = [
  param('id').isInt({ min: 1 }).withMessage('Customer ID must be a positive integer'),
  body('full_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .isLength({ min: 1, max: 255 })
    .withMessage('Full name must be 1-255 characters'),
  body('phone')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must be <= 20 characters'),
  body('email')
    .optional({ nullable: true })
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .isLength({ max: 255 })
    .withMessage('Email must be <= 255 characters'),
];

export const getCustomerValidator = [
  param('id').isInt({ min: 1 }).withMessage('Customer ID must be a positive integer'),
];
