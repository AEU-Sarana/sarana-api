"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshValidator = void 0;
const express_validator_1 = require("express-validator");
exports.refreshValidator = [
    (0, express_validator_1.body)('refresh_token')
        .trim()
        .notEmpty()
        .withMessage('refresh_token is required')
        .isString()
        .isLength({ min: 32, max: 1024 }),
    (0, express_validator_1.body)('device_id')
        .optional()
        .isString()
        .isLength({ min: 1, max: 255 }),
];
//# sourceMappingURL=refresh.validator.js.map