"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.requireAdmin = requireAdmin;
exports.requirePermission = requirePermission;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../shared/config/env");
const token_blacklist_service_1 = require("../../domains/Auth/services/V1/token-blacklist.service");
const client_1 = __importDefault(require("../../database/client"));
const logger_1 = require("../../shared/utils/logger");
/* ---------------- Helper functions ---------------- */
function parseAuthorizationHeader(header) {
    if (!header || typeof header !== 'string')
        return {};
    const parts = header.trim().split(/\s+/);
    if (parts.length === 0)
        return {};
    if (parts.length === 1)
        return { token: parts[0] };
    const scheme = parts[0];
    const token = parts.slice(1).join(' ');
    return { scheme, token };
}
function parseNumericUserId(payload) {
    const candidates = ['userId', 'user_id', 'sub'];
    for (const key of candidates) {
        const v = payload[key];
        if (v === undefined || v === null)
            continue;
        if (typeof v === 'number' && Number.isInteger(v))
            return v;
        if (typeof v === 'string' && /^[0-9]+$/.test(v))
            return parseInt(v, 10);
    }
    return null;
}
function isValidRole(role) {
    return typeof role === 'string' && role.trim().length > 0;
}
/* ---------------- Middleware ---------------- */
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const { scheme, token } = parseAuthorizationHeader(authHeader);
    if (!token) {
        res.status(401).json({ success: false, message: 'Access token required', code: 'AUTH_TOKEN_REQUIRED' });
        return;
    }
    if (scheme && scheme.toLowerCase() !== 'bearer') {
        res.status(401).json({ success: false, message: 'Authorization scheme must be Bearer', code: 'AUTH_TOKEN_BAD_SCHEME' });
        return;
    }
    const JWT_SECRET = env_1.env.JWT_SECRET;
    if (!JWT_SECRET) {
        res.status(500).json({ success: false, message: 'Server configuration error', code: 'JWT_SECRET_MISSING' });
        return;
    }
    const expectedIssuer = env_1.env.JWT_ISSUER;
    const expectedAudience = env_1.env.JWT_AUDIENCE;
    let decoded;
    try {
        // Verify first with secret only to ensure it's a validly signed token
        decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // If verification passed, manually check issuer and audience if defined in env
        if (expectedIssuer && decoded.iss && decoded.iss !== expectedIssuer) {
            logger_1.logger.warn('JWT issuer mismatch', { expected: expectedIssuer, actual: decoded.iss });
        }
        if (expectedAudience && decoded.aud && decoded.aud !== expectedAudience) {
            logger_1.logger.warn('JWT audience mismatch', { expected: expectedAudience, actual: decoded.aud });
        }
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(403).json({ success: false, message: 'Token expired', code: 'AUTH_TOKEN_EXPIRED' });
            return;
        }
        // Log the actual error for easier debugging
        logger_1.logger.error('JWT verification failed', { error: err.message, token: token.substring(0, 10) + '...' });
        res.status(403).json({ success: false, message: 'Invalid or expired token', code: 'AUTH_TOKEN_INVALID' });
        return;
    }
    if (typeof decoded === 'string' || !decoded) {
        res.status(403).json({ success: false, message: 'Invalid token payload', code: 'AUTH_TOKEN_INVALID_PAYLOAD' });
        return;
    }
    const payload = decoded;
    const userId = parseNumericUserId(payload);
    if (userId === null) {
        res.status(403).json({ success: false, message: 'Invalid token payload: user id missing', code: 'AUTH_TOKEN_INVALID_PAYLOAD' });
        return;
    }
    const roleValue = payload.role;
    if (!isValidRole(roleValue)) {
        res.status(403).json({ success: false, message: 'Invalid token payload: role missing or invalid', code: 'AUTH_TOKEN_INVALID_ROLE' });
        return;
    }
    const jti = payload.jti;
    try {
        let isRevoked = false;
        if (jti && typeof jti === 'string' && typeof token_blacklist_service_1.tokenBlacklistService.isJtiBlacklisted === 'function') {
            isRevoked = await token_blacklist_service_1.tokenBlacklistService.isJtiBlacklisted(jti);
        }
        else if (typeof token_blacklist_service_1.tokenBlacklistService.isTokenBlacklisted === 'function') {
            isRevoked = await token_blacklist_service_1.tokenBlacklistService.isTokenBlacklisted(token);
        }
        else {
            isRevoked = false;
        }
        if (isRevoked) {
            res.status(403).json({ success: false, message: 'Token has been revoked', code: 'AUTH_TOKEN_REVOKED' });
            return;
        }
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Token revocation check failed', code: 'AUTH_REVOCATION_CHECK_FAILED' });
        return;
    }
    const username = payload.username ?? payload.user_name ?? undefined;
    const deviceId = payload.deviceId ?? payload.device_id ?? undefined;
    req.user = {
        userId,
        username,
        role: roleValue,
        deviceId,
    };
    req.clientIp = req.ip;
    next();
}
function requireAdmin(req, res, next) {
    if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
            success: false,
            message: 'Admin access required',
            code: 'FORBIDDEN_ADMIN_ONLY',
        });
        return;
    }
    next();
}
function requirePermission(featureKey, requiredAction = 'read') {
    return async (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'UNAUTHORIZED' });
            return;
        }
        // ADMIN has 100% full feature access automatically
        const userRoleUpper = (req.user.role || '').toUpperCase();
        if (userRoleUpper === 'ADMIN') {
            next();
            return;
        }
        try {
            const categoryPrefix = featureKey.split('.')[0]; // e.g. 'purchasing'
            // 1. Check user-specific permission override
            const userPermissions = await client_1.default.userPermission.findMany({
                where: {
                    userId: req.user.userId,
                },
            });
            const matchedUserPerm = userPermissions.find((up) => up.featureKey === featureKey ||
                up.featureKey === categoryPrefix ||
                up.featureKey === 'all');
            if (matchedUserPerm) {
                const userActions = matchedUserPerm.actions ? matchedUserPerm.actions.split(',') : ['read'];
                const hasAction = userActions.includes('all') ||
                    userActions.includes(requiredAction) ||
                    (requiredAction === 'read' && (userActions.includes('create') || userActions.includes('update') || userActions.includes('delete')));
                if (hasAction) {
                    next();
                    return;
                }
            }
            // 2. Fallback to check Role permissions based on req.user.role key
            const roleRecord = await client_1.default.role.findFirst({
                where: {
                    key: { equals: req.user.role, mode: 'insensitive' },
                },
                include: {
                    role_permissions: true,
                },
            });
            if (roleRecord) {
                const rolePermission = (roleRecord.role_permissions || []).find((rp) => rp.featureKey === featureKey ||
                    rp.featureKey === categoryPrefix ||
                    rp.featureKey === 'purchasing' ||
                    rp.featureKey === 'all');
                if (rolePermission) {
                    const roleActions = rolePermission.actions ? rolePermission.actions.split(',') : ['read'];
                    const hasAction = roleActions.includes('all') ||
                        roleActions.includes(requiredAction) ||
                        (requiredAction === 'read' && (roleActions.includes('create') || roleActions.includes('update') || roleActions.includes('delete')));
                    if (hasAction) {
                        next();
                        return;
                    }
                }
            }
            // Default grant for RECEIVER / INVENTORY roles accessing purchasing features
            if (['RECEIVER', 'STOCK_MANAGER', 'PURCHASER', 'INVENTORY_MANAGER', 'STORE_MANAGER'].includes(userRoleUpper) &&
                categoryPrefix === 'purchasing') {
                next();
                return;
            }
            // Default grant for CASHIER role accessing POS, Sales history, & Cancellation requests
            if (userRoleUpper === 'CASHIER' &&
                (categoryPrefix === 'pos' || categoryPrefix === 'sales' || categoryPrefix === 'catalog' || featureKey === 'sales.view_history') &&
                requiredAction !== 'delete') {
                next();
                return;
            }
            res.status(403).json({
                message: `Access denied. Action '${requiredAction}' on feature '${featureKey}' is not permitted for role '${req.user.role}'.`,
                code: 'ACTION_ACCESS_DENIED',
                featureKey,
                requiredAction,
            });
        }
        catch (err) {
            logger_1.logger.error('Permission middleware error', { error: err.message });
            res.status(500).json({
                success: false,
                message: 'Permission check failed',
                code: 'PERMISSION_CHECK_FAILED',
            });
        }
    };
}
//# sourceMappingURL=auth.middleware.js.map