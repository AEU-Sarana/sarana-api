"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanReceiptValidator = void 0;
const express_validator_1 = require("express-validator");
exports.scanReceiptValidator = [
    (0, express_validator_1.body)('receipt_code').trim().notEmpty().withMessage('receipt_code is required'),
];
//# sourceMappingURL=scan-receipt.validator.js.map