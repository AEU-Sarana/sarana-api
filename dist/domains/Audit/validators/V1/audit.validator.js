"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogValidator = exports.listAuditLogsValidator = void 0;
const express_validator_1 = require("express-validator");
exports.listAuditLogsValidator = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
    (0, express_validator_1.query)('userId').optional().isInt().withMessage('User ID must be an integer'),
    (0, express_validator_1.query)('action').optional().isString().trim(),
    (0, express_validator_1.query)('entityType').optional().isString().trim(),
    (0, express_validator_1.query)('search').optional().isString().trim(),
    (0, express_validator_1.query)('dateFrom').optional().isISO8601().withMessage('dateFrom must be a valid ISO8601 date'),
    (0, express_validator_1.query)('dateTo').optional().isISO8601().withMessage('dateTo must be a valid ISO8601 date'),
    (0, express_validator_1.query)('sortBy').optional().isIn(['createdAt', 'action', 'entityType', 'logId']).withMessage('Invalid sortBy field'),
    (0, express_validator_1.query)('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
];
exports.getAuditLogValidator = [
    (0, express_validator_1.param)('id').isInt({ min: 1 }).withMessage('Audit log ID must be a valid positive integer'),
];
//# sourceMappingURL=audit.validator.js.map