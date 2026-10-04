"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiptScanRateLimiter = exports.authRateLimiter = exports.apiRateLimiter = void 0;
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
// No-op middleware for development (unlimited requests)
const noOpRateLimiter = (req, res, next) => {
    next();
};
// General API rate limit (production only)
const apiRateLimiterConfig = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Strict rate limit for auth endpoints (production only)
const authRateLimiterConfig = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
        success: false,
        message: 'Too many login attempts, please try again later',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
    skipSuccessfulRequests: true,
});
// Strict rate limit for receipt scanning (production only)
const receiptScanRateLimiterConfig = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 60,
    keyGenerator: (req) => {
        const receiptCode = typeof req.body?.receipt_code === 'string' ? req.body.receipt_code : 'unknown';
        return `${(0, express_rate_limit_1.ipKeyGenerator)(req.ip || 'unknown')}:${receiptCode}`;
    },
    message: {
        success: false,
        message: 'Too many scans, please try again later',
        code: 'SCAN_RATE_LIMIT_EXCEEDED',
    },
});
// Conditional rate limiters: rate limiting disabled by default (unlimited requests)
const isRateLimitEnabled = process.env.ENABLE_RATE_LIMIT === 'true';
exports.apiRateLimiter = isRateLimitEnabled ? apiRateLimiterConfig : noOpRateLimiter;
exports.authRateLimiter = isRateLimitEnabled ? authRateLimiterConfig : noOpRateLimiter;
exports.receiptScanRateLimiter = isRateLimitEnabled ? receiptScanRateLimiterConfig : noOpRateLimiter;
//# sourceMappingURL=rate-limit.middleware.js.map