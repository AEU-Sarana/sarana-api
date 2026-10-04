"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadReceiptLogoValidator = void 0;
const express_validator_1 = require("express-validator");
exports.uploadReceiptLogoValidator = [
    (0, express_validator_1.body)('content_type').optional().isIn(['image/png', 'image/jpeg', 'image/webp']),
    (0, express_validator_1.body)('size_bytes').optional().isInt({ min: 1, max: 2 * 1024 * 1024 }),
];
//# sourceMappingURL=upload-receipt-logo.validator.js.map