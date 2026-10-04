"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProductValidator = void 0;
const express_validator_1 = require("express-validator");
exports.deleteProductValidator = [
    (0, express_validator_1.param)('id').isInt({ min: 1 }).withMessage('Invalid product ID'),
];
//# sourceMappingURL=delete-product.validator.js.map