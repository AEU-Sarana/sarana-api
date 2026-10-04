"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nearExpiryValidator = void 0;
const express_validator_1 = require("express-validator");
exports.nearExpiryValidator = [
    (0, express_validator_1.query)('days')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('days must be an integer between 1 and 365'),
];
//# sourceMappingURL=inventory.validator.js.map