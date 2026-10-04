"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivateUserValidator = void 0;
const express_validator_1 = require("express-validator");
exports.deactivateUserValidator = [
    (0, express_validator_1.param)('id').isInt().withMessage('Invalid user ID'),
];
//# sourceMappingURL=deactivate-user.validator.js.map