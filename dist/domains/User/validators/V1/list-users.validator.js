"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsersValidator = void 0;
const express_validator_1 = require("express-validator");
exports.listUsersValidator = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('Limit must be between 1 and 10000'),
    (0, express_validator_1.query)('role').optional().isIn(['ADMIN', 'CASHIER']).withMessage('Role must be ADMIN or CASHIER'),
    (0, express_validator_1.query)('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
    (0, express_validator_1.query)('search').optional().isString().trim(),
];
//# sourceMappingURL=list-users.validator.js.map