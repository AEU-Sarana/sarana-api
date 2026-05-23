import { body, param } from 'express-validator';

export const createCategoryValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Category name must be 1-100 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
];

export const updateCategoryValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category name must be 1-100 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
];

export const getCategoryValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer')
    .toInt(),
];
