"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreBackupValidator = void 0;
const express_validator_1 = require("express-validator");
exports.restoreBackupValidator = [
    (0, express_validator_1.body)('backup_id')
        .notEmpty()
        .withMessage('backup_id is required')
        .isInt({ min: 1 })
        .withMessage('backup_id must be a positive integer')
        .toInt(),
];
//# sourceMappingURL=restore-backup.validator.js.map