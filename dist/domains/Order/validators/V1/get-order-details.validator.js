"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderValidator = void 0;
const express_validator_1 = require("express-validator");
exports.getOrderValidator = [
    (0, express_validator_1.param)('id').isInt().withMessage('Invalid order ID'),
];
//# sourceMappingURL=get-order-details.validator.js.map