"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyReceiptValidator = void 0;
const express_validator_1 = require("express-validator");
exports.verifyReceiptValidator = [
    (0, express_validator_1.body)('qr').optional().isString().trim(),
    (0, express_validator_1.body)('payload').optional().isObject(),
    (0, express_validator_1.body)('signature').optional().isString().trim(),
    (0, express_validator_1.body)().custom((value) => {
        if (value.qr)
            return true;
        if (value.payload && value.signature)
            return true;
        throw new Error('qr or payload+signature is required');
    }),
];
//# sourceMappingURL=verify-receipt.validator.js.map