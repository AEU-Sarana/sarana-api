"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationException = void 0;
class ValidationException extends Error {
    constructor(message, errors = [], code = 'VALIDATION_ERROR', statusCode = 400) {
        super(message);
        this.name = 'ValidationException';
        this.code = code;
        this.statusCode = statusCode;
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ValidationException = ValidationException;
//# sourceMappingURL=validation.exception.js.map