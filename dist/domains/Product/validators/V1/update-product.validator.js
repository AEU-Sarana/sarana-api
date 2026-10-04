"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductValidator = void 0;
const express_validator_1 = require("express-validator");
exports.updateProductValidator = [
    (0, express_validator_1.param)('id').isInt({ min: 1 }).withMessage('Invalid product ID'),
    (0, express_validator_1.body)('product_code').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Product code must be 1-50'),
    (0, express_validator_1.body)('product_name').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Product name must be 1-200'),
    (0, express_validator_1.body)('barcode').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Barcode must be 1-255'),
    (0, express_validator_1.body)('price').optional().isFloat({ min: 0 }).withMessage('Price must be >= 0'),
    (0, express_validator_1.body)('category_id')
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage('Category ID must be a positive integer'),
    (0, express_validator_1.body)('description').optional().isString().withMessage('Description must be a string'),
    (0, express_validator_1.body)('image_path').optional().trim().isLength({ max: 500 }).withMessage('Image path must be <= 500 chars'),
    (0, express_validator_1.body)('low_stock_threshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be >= 0'),
    (0, express_validator_1.body)('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
    (0, express_validator_1.body)('has_expiry').optional().isBoolean().withMessage('has_expiry must be boolean'),
];
//# sourceMappingURL=update-product.validator.js.map