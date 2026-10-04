"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordValidator = void 0;
const express_validator_1 = require("express-validator");
exports.changePasswordValidator = [
    (0, express_validator_1.body)('current_password')
        .notEmpty()
        .withMessage('Current password is required'),
    (0, express_validator_1.body)('new_password')
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
    (0, express_validator_1.body)('confirm_password')
        .notEmpty()
        .withMessage('Confirm password is required')
        .custom((value, { req }) => {
        if (value !== req.body.new_password) {
            throw new Error('Passwords do not match');
        }
        return true;
    }),
];
//# sourceMappingURL=change-password.validator.js.map