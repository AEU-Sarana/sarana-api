"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStockValidator = void 0;
const express_validator_1 = require("express-validator");
exports.getStockValidator = [
    (0, express_validator_1.param)('productId').optional().isInt().withMessage('Invalid product ID'),
    (0, express_validator_1.query)('version').optional().isInt({ min: 1 }).withMessage('Version must be a positive integer'),
    (0, express_validator_1.query)('status').optional().isIn(['in_stock', 'low_stock', 'out_of_stock', 'negative']).withMessage('Status must be one of: in_stock, low_stock, out_of_stock, negative'),
    (0, express_validator_1.query)('category').optional().isString().withMessage('Category must be a string'),
    (0, express_validator_1.query)('category_id').optional().isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
    (0, express_validator_1.query)('search').optional().isString().withMessage('Search must be a string'),
    (0, express_validator_1.query)('barcode').optional().isString().withMessage('Barcode must be a string'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('Limit must be between 1 and 10000'),
    (0, express_validator_1.query)('product_status').optional().isIn(['active', 'inactive']).withMessage('Product status must be active or inactive'),
];
//# sourceMappingURL=get-stock.validator.js.map