"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettingsValidator = void 0;
const express_validator_1 = require("express-validator");
const enums_1 = require("../../../../domains/Setting/enums");
exports.updateSettingsValidator = [
    (0, express_validator_1.body)('auto_backup')
        .notEmpty()
        .isBoolean()
        .withMessage('auto_backup must be a boolean')
        .toBoolean(),
    (0, express_validator_1.body)('backup_frequency')
        .notEmpty()
        .isIn(Object.values(enums_1.BackupFrequency))
        .withMessage('backup_frequency must be daily, weekly, or monthly'),
    (0, express_validator_1.body)('backup_schedule_time')
        .optional()
        .isString()
        .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
        .withMessage('backup_schedule_time must be in HH:mm format'),
    (0, express_validator_1.body)('stock_sync_policy')
        .notEmpty()
        .isIn(Object.values(enums_1.StockSyncPolicy))
        .withMessage('stock_sync_policy must be allow_with_cached or block_until_sync'),
    (0, express_validator_1.body)('report_send_enabled')
        .optional()
        .isBoolean()
        .withMessage('report_send_enabled must be a boolean')
        .toBoolean(),
    (0, express_validator_1.body)('report_send_time')
        .optional()
        .isString()
        .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
        .withMessage('report_send_time must be in HH:mm format'),
    (0, express_validator_1.body)('report_send_timezone')
        .optional()
        .isString()
        .notEmpty()
        .withMessage('report_send_timezone must be a valid timezone string'),
    // Invoice / Receipt info
    (0, express_validator_1.body)('store_name')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 200 })
        .withMessage('store_name must be a string with max 200 chars'),
    (0, express_validator_1.body)('store_phone')
        .optional({ nullable: true })
        .isString()
        .trim()
        .isLength({ max: 30 })
        .withMessage('store_phone must be a string with max 30 chars'),
    (0, express_validator_1.body)('store_address')
        .optional({ nullable: true })
        .isString()
        .trim()
        .withMessage('store_address must be a string'),
    (0, express_validator_1.body)('store_tax_id')
        .optional({ nullable: true })
        .isString()
        .trim()
        .isLength({ max: 100 })
        .withMessage('store_tax_id must be a string with max 100 chars'),
    (0, express_validator_1.body)('store_footer_note')
        .optional({ nullable: true })
        .isString()
        .trim()
        .withMessage('store_footer_note must be a string'),
    (0, express_validator_1.body)('is_logo_enabled')
        .optional()
        .isBoolean()
        .withMessage('is_logo_enabled must be a boolean')
        .toBoolean(),
    (0, express_validator_1.body)('is_footer_enabled')
        .optional()
        .isBoolean()
        .withMessage('is_footer_enabled must be a boolean')
        .toBoolean(),
];
//# sourceMappingURL=update-settings.validator.js.map