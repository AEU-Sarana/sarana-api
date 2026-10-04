"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProductValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createProductValidator = [
    (0, express_validator_1.body)('product_name')
        .trim()
        .notEmpty()
        .withMessage('Product name is required')
        .isLength({ min: 1, max: 200 })
        .withMessage('Product name must be 1-200 characters'),
    (0, express_validator_1.body)('barcode')
        .trim()
        .notEmpty()
        .withMessage('Barcode is required')
        .isLength({ min: 1, max: 255 })
        .withMessage('Barcode must be 1-255 characters'),
    (0, express_validator_1.body)('price').notEmpty().isFloat({ min: 0 }).withMessage('Price must be >= 0'),
    (0, express_validator_1.body)('category_id')
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage('Category ID must be a positive integer'),
    (0, express_validator_1.body)('description').optional().isString().withMessage('Description must be a string'),
    (0, express_validator_1.body)('image_path').optional().trim().isLength({ max: 500 }).withMessage('Image path must be <= 500 chars'),
    (0, express_validator_1.body)('low_stock_threshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be >= 0'),
    (0, express_validator_1.body)('has_expiry').optional().isBoolean().withMessage('has_expiry must be boolean'),
    (0, express_validator_1.body)('stock_qty').optional().isInt({ min: 0 }).withMessage('Stock quantity must be >= 0'),
    (0, express_validator_1.body)('expired_at').optional().isISO8601().withMessage('Expiry date must be a valid ISO 8601 date'),
    //NOTE dfdasfas
];
//# sourceMappingURL=create-product.validator.js.map