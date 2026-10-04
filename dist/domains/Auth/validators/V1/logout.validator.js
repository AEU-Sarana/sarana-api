"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutValidator = void 0;
const express_validator_1 = require("express-validator");
exports.logoutValidator = [
    (0, express_validator_1.body)('refresh_token')
        .trim()
        .notEmpty()
        .withMessage('refresh_token is required')
        .isString()
        .isLength({ min: 32, max: 1024 }),
];
//# sourceMappingURL=logout.validator.js.map