"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggingMiddleware = loggingMiddleware;
const logger_1 = require("../../shared/utils/logger");
function loggingMiddleware(req, res, next) {
    const startTime = Date.now();
    // Log request
    logger_1.logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        query: req.query,
        userId: req.user?.userId,
        ip: req.ip,
    });
    // Log response
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger_1.logger.info('Request completed', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userId: req.user?.userId,
        });
    });
    next();
}
//# sourceMappingURL=logging.middleware.js.map