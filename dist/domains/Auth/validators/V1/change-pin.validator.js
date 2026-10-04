"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePINValidator = void 0;
const express_validator_1 = require("express-validator");
exports.changePINValidator = [
    (0, express_validator_1.body)('current_pin')
        .notEmpty()
        .withMessage('Current PIN is required')
        .isString()
        .withMessage('Current PIN must be a string')
        .isLength({ min: 4, max: 6 })
        .withMessage('Current PIN must be 4-6 digits')
        .matches(/^\d{4,6}$/)
        .withMessage('Current PIN must contain only numeric digits'),
    (0, express_validator_1.body)('new_pin')
        .notEmpty()
        .withMessage('New PIN is required')
        .isString()
        .withMessage('New PIN must be a string')
        .isLength({ min: 4, max: 6 })
        .withMessage('New PIN must be 4-6 digits')
        .matches(/^\d{4,6}$/)
        .withMessage('New PIN must contain only numeric digits'),
];
//# sourceMappingURL=change-pin.validator.js.map