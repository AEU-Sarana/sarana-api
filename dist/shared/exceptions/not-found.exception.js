"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundException = void 0;
class NotFoundException extends Error {
    constructor(message = 'Not found', code = 'NOT_FOUND', details) {
        super(message);
        this.name = 'NotFoundException';
        this.code = code;
        this.statusCode = 404;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.NotFoundException = NotFoundException;
//# sourceMappingURL=not-found.exception.js.map