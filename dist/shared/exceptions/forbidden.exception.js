"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForbiddenException = void 0;
class ForbiddenException extends Error {
    constructor(message = 'Forbidden', code = 'FORBIDDEN', details) {
        super(message);
        this.name = 'ForbiddenException';
        this.code = code;
        this.statusCode = 403;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ForbiddenException = ForbiddenException;
//# sourceMappingURL=forbidden.exception.js.map