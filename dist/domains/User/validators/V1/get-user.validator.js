"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserValidator = void 0;
const express_validator_1 = require("express-validator");
exports.getUserValidator = [
    (0, express_validator_1.param)('id').isInt().withMessage('Invalid user ID'),
];
//# sourceMappingURL=get-user.validator.js.map