"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
exports.validateRequest = validateRequest;
const express_validator_1 = require("express-validator");
const exceptions_1 = require("../../shared/exceptions");
function validate(validations) {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map((validation) => validation.run(req)));
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new exceptions_1.ValidationException('Validation failed', errors.array());
        }
        next();
    };
}
function validateRequest(validations) {
    return [validations, validate(validations)];
}
//# sourceMappingURL=validation.middleware.js.map