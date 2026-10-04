"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginValidator = void 0;
const express_validator_1 = require("express-validator");
exports.loginValidator = [
    (0, express_validator_1.body)('username')
        .trim()
        .notEmpty()
        .withMessage('username is required')
        .isLength({ min: 3, max: 100 }),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('password is required')
        .isLength({ min: 6 }),
    (0, express_validator_1.body)('device_id')
        .optional()
        .isString()
        .isLength({ min: 1, max: 255 }),
];
//# sourceMappingURL=login.validator.js.map