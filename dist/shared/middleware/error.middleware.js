"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = errorMiddleware;
const logger_1 = require("../../shared/utils/logger");
const exceptions_1 = require("../../shared/exceptions");
function errorMiddleware(err, req, res, next) {
    // Log error
    logger_1.logger.error('Error occurred:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.userId,
    });
    // Handle known exceptions
    if (err instanceof exceptions_1.ValidationException) {
        const validationErr = err;
        res.status(validationErr.statusCode || 400).json({
            success: false,
            message: validationErr.message,
            code: validationErr.code || 'VALIDATION_ERROR',
            errors: validationErr.errors,
        });
        return;
    }
    if (err instanceof exceptions_1.ForbiddenException) {
        res.status(err.statusCode || 403).json({
            success: false,
            message: err.message,
            code: err.code || 'FORBIDDEN',
            ...(err.details && { details: err.details }),
        });
        return;
    }
    if (err instanceof exceptions_1.NotFoundException) {
        res.status(err.statusCode || 404).json({
            success: false,
            message: err.message,
            code: err.code || 'NOT_FOUND',
            ...(err.details && { details: err.details }),
        });
        return;
    }
    if (err instanceof exceptions_1.BusinessLogicException) {
        res.status(err.statusCode || 422).json({
            success: false,
            message: err.message,
            code: err.code || 'BUSINESS_LOGIC_ERROR',
            ...(err.details && { details: err.details }),
        });
        return;
    }
    if (err instanceof exceptions_1.DomainException) {
        res.status(err.statusCode || 400).json({
            success: false,
            message: err.message,
            code: err.code || 'DOMAIN_ERROR',
        });
        return;
    }
    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaErr = err;
        const isDevelopment = process.env.NODE_ENV === 'development';
        res.status(400).json({
            success: false,
            message: 'Database operation failed',
            code: 'DATABASE_ERROR',
            ...(isDevelopment && {
                prisma_code: prismaErr.code,
                prisma_meta: prismaErr.meta,
                prisma_message: prismaErr.message,
            }),
        });
        return;
    }
    // Default error response
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({
        success: false,
        message: isDevelopment ? err.message : 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        ...(isDevelopment && { stack: err.stack }),
    });
}
//# sourceMappingURL=error.middleware.js.map