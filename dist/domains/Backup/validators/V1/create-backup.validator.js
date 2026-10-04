"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBackupValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createBackupValidator = [
    (0, express_validator_1.body)('backup_name')
        .trim()
        .notEmpty()
        .withMessage('backup_name is required')
        .isLength({ min: 3, max: 120 })
        .withMessage('backup_name must be between 3 and 120 characters'),
    (0, express_validator_1.body)('include_data')
        .notEmpty()
        .isBoolean()
        .withMessage('include_data must be a boolean')
        .toBoolean(),
];
//# sourceMappingURL=create-backup.validator.js.map