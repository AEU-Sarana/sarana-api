"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdminOrSeller = void 0;
exports.requireRole = requireRole;
exports.requirePermission = requirePermission;
exports.requireAdmin = requireAdmin;
exports.requireAdminOrCashier = requireAdminOrCashier;
const permissions_1 = require("../../shared/config/permissions");
/**
 * Middleware to require specific role(s)
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTH_REQUIRED',
            });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: allowedRoles,
                current: req.user.role,
            });
            return;
        }
        next();
    };
}
/**
 * Middleware to require specific permission(s)
 */
function requirePermission(...permissions) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTH_REQUIRED',
            });
            return;
        }
        const userRole = req.user.role;
        const hasAllPermissions = permissions.every((permission) => (0, permissions_1.hasPermission)(userRole, permission));
        if (!hasAllPermissions) {
            res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: permissions,
                current: userRole,
            });
            return;
        }
        next();
    };
}
/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
    requireRole(permissions_1.Role.ADMIN)(req, res, next);
}
/**
 * Middleware to require admin or cashier role
 */
function requireAdminOrCashier(req, res, next) {
    requireRole(permissions_1.Role.ADMIN, permissions_1.Role.CASHIER)(req, res, next);
}
exports.requireAdminOrSeller = requireAdminOrCashier;
//# sourceMappingURL=authorization.middleware.js.map