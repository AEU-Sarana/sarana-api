"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileValidator = void 0;
const express_validator_1 = require("express-validator");
exports.updateProfileValidator = [
    (0, express_validator_1.body)('full_name')
        .optional()
        .isString()
        .withMessage('Full name must be a string')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('email')
        .optional()
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    (0, express_validator_1.body)('username')
        .optional()
        .isString()
        .withMessage('Username must be a string')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Username must be between 2 and 100 characters'),
    (0, express_validator_1.body)('phone')
        .optional()
        .isString()
        .withMessage('Phone must be a string')
        .matches(/^\+?[0-9\s-]{8,20}$/)
        .withMessage('Invalid phone format'),
    (0, express_validator_1.body)('bio')
        .optional()
        .isString()
        .withMessage('Bio must be a string')
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio cannot exceed 500 characters'),
];
//# sourceMappingURL=update-profile.validator.js.map