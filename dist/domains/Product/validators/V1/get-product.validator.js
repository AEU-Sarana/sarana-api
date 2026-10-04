"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductValidator = void 0;
const express_validator_1 = require("express-validator");
exports.getProductValidator = [
    (0, express_validator_1.param)('id').isInt({ min: 1 }).withMessage('Invalid product ID'),
];
//# sourceMappingURL=get-product.validator.js.map