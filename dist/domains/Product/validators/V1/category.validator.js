"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryValidator = exports.updateCategoryValidator = exports.createCategoryValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createCategoryValidator = [
    (0, express_validator_1.body)('name')
        .trim()
        .notEmpty()
        .withMessage('Category name is required')
        .isLength({ min: 1, max: 100 })
        .withMessage('Category name must be 1-100 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .withMessage('Description must be a string'),
];
exports.updateCategoryValidator = [
    (0, express_validator_1.body)('name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Category name must be 1-100 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .withMessage('Description must be a string'),
];
exports.getCategoryValidator = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 })
        .withMessage('Category ID must be a positive integer')
        .toInt(),
];
//# sourceMappingURL=category.validator.js.map