"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProductsValidator = void 0;
const express_validator_1 = require("express-validator");
exports.listProductsValidator = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('Limit must be between 1 and 10000'),
    (0, express_validator_1.query)('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
    (0, express_validator_1.query)('category').optional().isString().trim().isLength({ max: 100 }).withMessage('Category must be <= 100 chars'),
    (0, express_validator_1.query)('category_id').optional().isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
    (0, express_validator_1.query)('search').optional().isString().trim().isLength({ max: 200 }).withMessage('Search must be <= 200 chars'),
    (0, express_validator_1.query)('barcode').optional().isString().trim().isLength({ max: 255 }).withMessage('Barcode must be <= 255 chars'),
];
//# sourceMappingURL=list-products.validator.js.map