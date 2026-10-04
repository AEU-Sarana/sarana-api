"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainException = void 0;
class DomainException extends Error {
    constructor(message, code = 'DOMAIN_ERROR', statusCode = 400) {
        super(message);
        this.name = 'DomainException';
        this.code = code;
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.DomainException = DomainException;
//# sourceMappingURL=domain.exception.js.map