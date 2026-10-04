"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleStatusValidator = void 0;
const express_validator_1 = require("express-validator");
exports.toggleStatusValidator = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 })
        .withMessage('Product ID must be a positive integer')
        .toInt(),
];
//# sourceMappingURL=toggle-status.validator.js.map