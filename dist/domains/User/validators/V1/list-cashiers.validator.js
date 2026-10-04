"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCashiersValidator = void 0;
const express_validator_1 = require("express-validator");
exports.listCashiersValidator = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 10000 }),
    (0, express_validator_1.query)('status').optional().isIn(['active', 'inactive']),
    (0, express_validator_1.query)('search').optional().isString().trim(),
];
//# sourceMappingURL=list-cashiers.validator.js.map