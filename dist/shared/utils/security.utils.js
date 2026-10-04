"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeCompare = safeCompare;
exports.maskSecret = maskSecret;
exports.sanitizeForLog = sanitizeForLog;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Constant-time comparison to prevent timing attacks
 */
function safeCompare(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    return crypto_1.default.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
/**
 * Sanitizes sensitive strings for logging
 * Examples:
 * LINK_abc123... -> LINK_abc***
 * RCP-2024-001 -> RCP-2024***
 * 435ergfd -> 435***
 */
function maskSecret(secret, visibleChars = 4) {
    if (!secret)
        return '***';
    const str = String(secret);
    if (str.length <= visibleChars)
        return '***';
    if (str.startsWith('LINK_')) {
        return `LINK_${str.substring(5, 5 + visibleChars)}***`;
    }
    if (str.startsWith('ADM-')) {
        return `ADM-${str.substring(4, 4 + visibleChars)}***`;
    }
    if (str.startsWith('RCP-')) {
        return `RCP-${str.substring(4, 4 + 10)}***`;
    }
    return `${str.substring(0, visibleChars)}***`;
}
/**
 * Generic data sanitizer for logs
 */
function sanitizeForLog(data) {
    if (!data)
        return data;
    if (typeof data !== 'object')
        return data;
    const sensitiveKeys = ['code', 'token', 'authorization', 'cookie', 'password', 'secret', 'receipt_code'];
    const sanitized = { ...data };
    for (const key of Object.keys(sanitized)) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
            sanitized[key] = maskSecret(sanitized[key]);
        }
        else if (typeof sanitized[key] === 'object') {
            sanitized[key] = sanitizeForLog(sanitized[key]);
        }
    }
    return sanitized;
}
//# sourceMappingURL=security.utils.js.map