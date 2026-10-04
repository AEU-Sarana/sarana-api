"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditMutationMiddleware = auditMutationMiddleware;
const audit_log_service_1 = require("../../shared/services/audit-log.service");
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
function auditMutationMiddleware(req, res, next) {
    if (!MUTATION_METHODS.has(req.method)) {
        next();
        return;
    }
    res.on('finish', () => {
        const userId = req.user?.userId;
        const action = `API_MUTATION_${req.method}`;
        void audit_log_service_1.auditLogService.createAuditLog({
            userId,
            action,
            resource: 'API',
            details: {
                method: req.method,
                path: req.originalUrl,
                status: res.statusCode,
                success: res.statusCode < 400,
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent') || undefined,
        });
    });
    next();
}
//# sourceMappingURL=audit-mutation.middleware.js.map