"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPinValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createPinValidator = [
    (0, express_validator_1.param)('id').isInt().withMessage('Invalid user ID'),
    (0, express_validator_1.body)('pin').isString().isLength({ min: 4, max: 6 }).withMessage('PIN must be 4-6 digits'),
];
//# sourceMappingURL=create-pin.validator.js.map