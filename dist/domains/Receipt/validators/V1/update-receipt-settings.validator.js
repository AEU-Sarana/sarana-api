"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReceiptSettingsValidator = void 0;
const express_validator_1 = require("express-validator");
exports.updateReceiptSettingsValidator = [
    (0, express_validator_1.body)('store_name')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('store_name must be between 2 and 200 characters'),
    (0, express_validator_1.body)('phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
    (0, express_validator_1.body)('address').optional({ nullable: true }).trim().isLength({ max: 1000 }),
    (0, express_validator_1.body)('tax_id').optional({ nullable: true }).trim().isLength({ max: 100 }),
    (0, express_validator_1.body)('footer_note').optional({ nullable: true }).trim().isLength({ max: 1000 }),
    (0, express_validator_1.body)('is_logo_enabled').optional().isBoolean(),
    (0, express_validator_1.body)('is_footer_enabled').optional().isBoolean(),
];
//# sourceMappingURL=update-receipt-settings.validator.js.map