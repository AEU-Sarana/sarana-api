"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBackupsValidator = void 0;
const express_validator_1 = require("express-validator");
exports.listBackupsValidator = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('Limit must be between 1 and 10000'),
];
//# sourceMappingURL=list-backups.validator.js.map