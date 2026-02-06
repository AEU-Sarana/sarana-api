import { body } from 'express-validator';

export const createProductValidator = [
  body('product_code')
    .trim()
    .notEmpty()
    .withMessage('Product code is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Product code must be 1-50 characters'),
  body('product_name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Product name must be 1-200 characters'),
  body('barcode')
    .trim()
    .notEmpty()
    .withMessage('Barcode is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Barcode must be 1-255 characters'),
  body('price').notEmpty().isFloat({ min: 0 }).withMessage('Price must be >= 0'),
  body('category').optional().trim().isLength({ max: 100 }).withMessage('Category must be <= 100 chars'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('image_path').optional().trim().isLength({ max: 500 }).withMessage('Image path must be <= 500 chars'),
  body('low_stock_threshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be >= 0'),
  body('has_expiry').optional().isBoolean().withMessage('has_expiry must be boolean'),
];
