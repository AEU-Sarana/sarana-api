"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessLogicException = void 0;
class BusinessLogicException extends Error {
    constructor(message, code = 'BUSINESS_LOGIC_ERROR', statusCode = 422, details) {
        super(message);
        this.name = 'BusinessLogicException';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.BusinessLogicException = BusinessLogicException;
//# sourceMappingURL=business-logic.exception.js.map